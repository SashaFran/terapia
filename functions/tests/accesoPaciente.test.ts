// @vitest-environment node
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
const state = vi.hoisted(() => ({ docs: new Map<string, any>(), serial: Promise.resolve() }));
vi.mock("firebase-admin", () => {
  const ref = (path: string) => ({ path, id: path.split("/")[1] });
  const snapshot = (path: string) => ({ ...ref(path), ref: ref(path), exists: state.docs.has(path), data: () => state.docs.get(path) });
  const collection = (name: string) => ({
    doc: (id: string) => ref(`${name}/${id}`),
    where: (field: string, _op: string, value: unknown) => {
      let max = Infinity;
      const query = { limit: (n: number) => { max = n; return query; }, get: async () => {
        const docs = [...state.docs].filter(([path, data]) => path.startsWith(`${name}/`) && data[field] === value).slice(0, max).map(([path]) => snapshot(path));
        return { docs, size: docs.length, empty: !docs.length };
      } };
      return query;
    },
  });
  const db = { collection, runTransaction: (fn: any) => {
    const run = state.serial.then(async () => {
      const writes: (() => void)[] = [];
      const result = await fn({
        get: (r: any) => r.get ? r.get() : Promise.resolve(snapshot(r.path)),
        set: (r: any, data: any) => writes.push(() => { state.docs.set(r.path, data); }),
        update: (r: any, data: any) => writes.push(() => { state.docs.set(r.path, { ...state.docs.get(r.path), ...data }); }),
      });
      writes.forEach(fn => fn());
      return result;
    });
    state.serial = run.catch(() => {});
    return run;
  } };
  return { firestore: Object.assign(() => db, { Timestamp: { fromMillis: (n: number) => ({ toMillis: () => n }) } }) };
});
import { iniciarAcceso, operarAcceso, expirarAccesos } from "../src/accesoPaciente";
const token = "a".repeat(64);
const ts = (n: number) => ({ toMillis: () => n });
const action = (accion: any, extra = {}) => operarAcceso("u1", { pacienteId: "p1", token, accion, ...extra });
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(1000000); state.docs.clear(); state.serial = Promise.resolve();
  state.docs.set("pacientes/p1", { uid: "u1", dni: "12345678", nombre: "Paciente", password: "secret", activo: true,
    archivodni: "https://res.cloudinary.com/example/image.png", fechaInicioAcceso: ts(1), fechaFinAcceso: ts(99999999) });
  state.docs.set("asignaciones/a1", { pacienteId: "p1", testId: "k10", estado: "pendiente" });
  state.docs.set("asignaciones/a2", { pacienteId: "p1", testId: "bfq", estado: "pendiente" });
});
afterEach(() => vi.useRealTimers());
describe("single-use patient access", () => {
  it("allows a same-request retry, excludes passwords, and rejects another page", async () => {
    expect(await iniciarAcceso("u1", token)).not.toHaveProperty("password");
    await iniciarAcceso("u1", token);
    await expect(iniciarAcceso("u1", "b".repeat(64))).rejects.toMatchObject({ code: "failed-precondition" });
  });
  it("rejects inactive patients and access before its date", async () => {
    state.docs.get("pacientes/p1").activo = false;
    await expect(iniciarAcceso("u1", token)).rejects.toMatchObject({
      message: "La cuenta está inhabilitada. Contacte a administración para solicitar asistencia.",
    });
    state.docs.get("pacientes/p1").activo = true;
    state.docs.get("pacientes/p1").fechaInicioAcceso = ts(2000000);
    await expect(iniciarAcceso("u1", token)).rejects.toMatchObject({
      message: "Su período de acceso todavía no comenzó.",
    });
  });
  it("explains expired and abandoned access states", async () => {
    state.docs.get("pacientes/p1").fechaFinAcceso = ts(999999);
    await expect(iniciarAcceso("u1", token)).rejects.toMatchObject({
      message: "El período de acceso venció. Contacte a administración para solicitar una renovación.",
    });

    state.docs.get("pacientes/p1").fechaFinAcceso = ts(99999999);
    state.docs.get("pacientes/p1").activo = false;
    state.docs.get("pacientes/p1").accesoEstado = "abandonada";
    await expect(iniciarAcceso("u1", token)).rejects.toMatchObject({
      message: "El acceso fue inhabilitado porque la evaluación quedó abandonada. Contacte a administración si necesita asistencia.",
    });

    state.docs.get("pacientes/p1").accesoEstado = "finalizada";
    await expect(iniciarAcceso("u1", token)).rejects.toMatchObject({
      message: "El acceso fue cerrado porque las evaluaciones ya finalizaron. Contacte a administración si necesita asistencia.",
    });
  });
  it("closing before doing any tests disables the account and every pending assignment", async () => {
    await iniciarAcceso("u1", token);
    await action("cerrar");
    expect(state.docs.get("pacientes/p1")).toMatchObject({ activo: false, accesoEstado: "abandonada" });
    expect(state.docs.get("asignaciones/a1").estado).toBe("abandono");
    expect(state.docs.get("asignaciones/a2").estado).toBe("abandono");
    await expect(iniciarAcceso("u1", token)).rejects.toThrow();
  });
  it("preserves completed results on close and makes completion retries idempotent", async () => {
    await iniciarAcceso("u1", token); await action("iniciarTest", { testId: "k10" });
    await action("finalizarTest", { testId: "k10", resultado: { respuestas: [2], score: 2 } });
    await action("finalizarTest", { testId: "k10", resultado: { respuestas: [5], score: 5 } });
    await action("cerrar");
    expect(state.docs.get("asignaciones/a1").estado).toBe("completado");
    expect(state.docs.get("resultados/p1_a1").respuestas).toEqual([2]);
    expect(state.docs.get("asignaciones/a2").estado).toBe("abandono");
  });
  it("uses finalizada when all tests were completed but still disables reentry", async () => {
    await iniciarAcceso("u1", token);
    state.docs.get("asignaciones/a1").estado = "completado";
    state.docs.get("asignaciones/a2").estado = "completado";
    await action("cerrar");
    expect(state.docs.get("pacientes/p1")).toMatchObject({ activo: false, accesoEstado: "finalizada" });
  });
  it("returning before two minutes preserves the current test", async () => {
    await iniciarAcceso("u1", token); await action("iniciarTest", { testId: "k10" }); await action("fuera");
    vi.setSystemTime(1119000); await action("volver");
    expect(state.docs.get("asignaciones/a1").estado).toBe("en_curso");
    expect(state.docs.get("accesosPaciente/p1").fueraHastaMs).toBeNull();
  });
  it("two minutes away abandons only the current test and refuses late results", async () => {
    await iniciarAcceso("u1", token); await action("iniciarTest", { testId: "k10" }); await action("fuera");
    vi.setSystemTime(1060000); await action("latido");
    vi.setSystemTime(1120000);
    expect(await action("finalizarTest", { testId: "k10", resultado: { respuestas: [1] } })).toMatchObject({ testAbandonado: "k10" });
    expect(state.docs.has("resultados/p1_a1")).toBe(false);
    expect(state.docs.get("asignaciones/a2").estado).toBe("pendiente");
    expect(state.docs.get("pacientes/p1").activo).toBe(true);
    await expect(action("iniciarTest", { testId: "k10" })).rejects.toThrow();
  });
  it("explicit abandonment cannot be restarted or submitted", async () => {
    await iniciarAcceso("u1", token); await action("iniciarTest", { testId: "k10" }); await action("abandonarTest", { testId: "k10" });
    await expect(action("iniciarTest", { testId: "k10" })).rejects.toThrow();
    await expect(action("finalizarTest", { testId: "k10" })).rejects.toThrow();
  });
  it("expires silent closures without a client event", async () => {
    await iniciarAcceso("u1", token); vi.setSystemTime(1120001); await expirarAccesos();
    expect(state.docs.get("pacientes/p1").activo).toBe(false);
  });
  it("does not accept a forged token or another patient's identity", async () => {
    await iniciarAcceso("u1", token);
    await expect(operarAcceso("u2", { pacienteId: "p1", token, accion: "cerrar" })).rejects.toMatchObject({ code: "permission-denied" });
    await expect(operarAcceso(null, { pacienteId: "p1", token: "b".repeat(64), accion: "cerrar" })).rejects.toMatchObject({ code: "permission-denied" });
    expect(state.docs.get("pacientes/p1").activo).toBe(true);
  });
  it("limits progress writes to the running test and rejects oversized data", async () => {
    await iniciarAcceso("u1", token);
    await expect(action("guardarProgreso", { testId: "k10", progreso: {} })).rejects.toThrow();
    await action("iniciarTest", { testId: "k10" });
    await action("guardarProgreso", { testId: "k10", progreso: { respuestas: [1] } });
    expect(state.docs.get("test_progress/p1_k10").userId).toBe("p1");
    await expect(action("guardarProgreso", { testId: "bfq", progreso: {} })).rejects.toThrow();
    await expect(action("guardarProgreso", { testId: "k10", progreso: { respuesta: "x".repeat(200001) } })).rejects.toThrow();
  });
});
