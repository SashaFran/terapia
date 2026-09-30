import * as admin from "firebase-admin";
import { createHash } from "node:crypto";
import { HttpsError } from "firebase-functions/v1/https";

export const GRACIA_MS = 120000;
const DURACION_TEST_MS = 30 * 60000;
const hash = (value: string) => createHash("sha256").update(value).digest("hex");
const deny = () => new HttpsError("failed-precondition", "Este acceso ya fue utilizado o quedó inhabilitado. Contacte a administración.");
const millis = (value: admin.firestore.Timestamp | undefined) => value?.toMillis() ?? 0;

export function validarToken(token: unknown): asserts token is string {
  if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token)) {
    throw new HttpsError("invalid-argument", "Sesión inválida.");
  }
}

function perfil(id: string, data: admin.firestore.DocumentData) {
  // Never return the stored password or the session capability to the browser.
  return { id, uid: data.uid, nombre: data.nombre, dni: data.dni,
    contacto: data.contacto ?? "", archivodni: data.archivodni ?? null,
    dni_public_id: data.dni_public_id ?? null, activo: data.activo,
    fechaInicioAcceso: { seconds: Math.floor(millis(data.fechaInicioAcceso) / 1000) },
    fechaFinAcceso: { seconds: Math.floor(millis(data.fechaFinAcceso) / 1000) } };
}

export async function iniciarAcceso(uid: string, token: string) {
  validarToken(token);
  const db = admin.firestore();
  const matches = await db.collection("pacientes").where("uid", "==", uid).limit(2).get();
  if (matches.size !== 1) throw deny();
  const ref = matches.docs[0].ref;
  const accessRef = db.collection("accesosPaciente").doc(ref.id);
  return db.runTransaction(async tx => {
    const patient = (await tx.get(ref)).data()!;
    const access = (await tx.get(accessRef)).data();
    const now = Date.now();
    if (patient.activo === false || millis(patient.fechaFinAcceso) <= now) throw deny();
    if (millis(patient.fechaInicioAcceso) > now) {
      throw new HttpsError("failed-precondition", "Su período de acceso todavía no comenzó.");
    }
    // Retry of the same login request is safe; another page cannot resume it.
    if (access) {
      if (access.tokenHash !== hash(token) || access.estado !== "activa" || access.hastaMs <= now) throw deny();
      return perfil(ref.id, patient);
    }
    tx.set(accessRef, { uid, tokenHash: hash(token), estado: "activa", inicioMs: now,
      hastaMs: now + GRACIA_MS, fueraHastaMs: null, testId: null });
    tx.update(ref, { accesoEstado: "activa", sesionHasta: admin.firestore.Timestamp.fromMillis(now + GRACIA_MS) });
    return perfil(ref.id, patient);
  });
}

type Accion = "latido" | "fuera" | "volver" | "cerrar" | "iniciarTest" | "abandonarTest" | "finalizarTest" | "guardarProgreso";
const acciones: Accion[] = ["latido", "fuera", "volver", "cerrar", "iniciarTest", "abandonarTest", "finalizarTest", "guardarProgreso"];
type Peticion = { pacienteId: string; token: string; accion: Accion; testId?: string; resultado?: Record<string, unknown>; progreso?: Record<string, unknown> };

export async function operarAcceso(uid: string | null, input: Peticion, expiryOnly = false) {
  if (!input || typeof input.pacienteId !== "string" || !/^[\w-]{1,128}$/.test(input.pacienteId) || !acciones.includes(input.accion)) {
    throw new HttpsError("invalid-argument", "Solicitud inválida.");
  }
  if (!expiryOnly) validarToken(input.token);
  const db = admin.firestore();
  const patientRef = db.collection("pacientes").doc(input.pacienteId);
  const accessRef = db.collection("accesosPaciente").doc(input.pacienteId);
  return db.runTransaction(async tx => {
    const patient = (await tx.get(patientRef)).data();
    const access = (await tx.get(accessRef)).data();
    if (!patient || !access) throw deny();
    if (!expiryOnly && ((uid !== null && uid !== patient.uid) || access.tokenHash !== hash(input.token))) {
      throw new HttpsError("permission-denied", "La sesión no corresponde al paciente.");
    }
    const now = Date.now();
    if (expiryOnly && access.hastaMs > now) return { estado: access.estado };
    if (access.estado !== "activa") return { estado: access.estado };
    const assignments = await tx.get(db.collection("asignaciones").where("pacienteId", "==", input.pacienteId));
    const target = assignments.docs.find(d => d.data().testId === input.testId);
    const close = input.accion === "cerrar" || access.hastaMs <= now ||
      patient.activo === false || millis(patient.fechaFinAcceso) <= now;
    if (close) {
      const completed = assignments.docs.length > 0 && assignments.docs.every(d => d.data().estado === "completado");
      const estado = completed ? "finalizada" : "abandonada";
      tx.update(accessRef, { estado, cierreMs: now, motivo: input.accion === "cerrar" ? "salida" : "sin_actividad" });
      tx.update(patientRef, { activo: false, accesoEstado: estado });
      assignments.docs.filter(d => d.data().estado !== "completado").forEach(d =>
        tx.update(d.ref, { estado: "abandono", motivoAbandono: "cierre_sesion", fechaAbandono: admin.firestore.Timestamp.fromMillis(now) }));
      return { estado };
    }
    let currentTest = access.testId as string | null;
    let fueraHastaMs = access.fueraHastaMs as number | null;
    let testAbandonado: string | null = null;
    const abandon = (testId: string, motivo: string) => {
      assignments.docs.filter(d => d.data().testId === testId && d.data().estado !== "completado").forEach(d =>
        tx.update(d.ref, { estado: "abandono", motivoAbandono: motivo, fechaAbandono: admin.firestore.Timestamp.fromMillis(now) }));
      testAbandonado = testId;
      currentTest = null;
      fueraHastaMs = null;
    };
    if (currentTest && fueraHastaMs !== null && now >= fueraHastaMs) abandon(currentTest, "fuera_de_pantalla");
    if (input.accion === "iniciarTest" && !testAbandonado) {
      if (!target || target.data().estado !== "pendiente" || currentTest || !patient.archivodni) throw deny();
      currentTest = input.testId!;
      fueraHastaMs = null;
      tx.update(target.ref, { estado: "en_curso", inicioMs: now });
    } else if (input.accion === "fuera" && currentTest && fueraHastaMs === null) {
      fueraHastaMs = now + GRACIA_MS;
    } else if (input.accion === "volver") {
      fueraHastaMs = null;
    } else if (input.accion === "abandonarTest" && currentTest === input.testId) {
      abandon(currentTest!, "salida_voluntaria");
    } else if (input.accion === "guardarProgreso" && !testAbandonado) {
      if (!currentTest || currentTest !== input.testId || !input.progreso || typeof input.progreso !== "object" || Array.isArray(input.progreso)) throw deny();
      if (JSON.stringify(input.progreso).length > 200000) throw new HttpsError("invalid-argument", "Progreso demasiado grande.");
      tx.set(db.collection("test_progress").doc(`${input.pacienteId}_${currentTest}`), {
        userId: input.pacienteId, testId: currentTest, data: input.progreso, updatedAt: admin.firestore.Timestamp.fromMillis(now),
      });
    } else if (input.accion === "finalizarTest" && !testAbandonado) {
      if (target?.data().estado === "completado") return { estado: "activa", completado: true };
      if (!target || target.data().estado !== "en_curso" || currentTest !== input.testId) throw deny();
      const incoming = input.resultado ?? {};
      const safe: Record<string, unknown> = {};
      for (const key of ["respuestas", "score", "nivel", "metodo", "dimensiones", "errores", "resumenClinico", "archivoCaptura", "captura_public_id"]) {
        if (incoming[key] !== undefined) safe[key] = incoming[key];
      }
      if (JSON.stringify(safe).length > 300000) throw new HttpsError("invalid-argument", "Resultado demasiado grande.");
      const elapsed = now - target.data().inicioMs;
      tx.set(db.collection("resultados").doc(`${input.pacienteId}_${target.id}`), {
        ...safe, pacienteId: input.pacienteId, testId: input.testId,
        fecha: admin.firestore.Timestamp.fromMillis(now), tiempoTotalMs: Math.min(DURACION_TEST_MS, elapsed),
        out_of_time: elapsed >= DURACION_TEST_MS,
      });
      tx.update(target.ref, { estado: "completado", fechaCompletado: admin.firestore.Timestamp.fromMillis(now) });
      currentTest = null;
      fueraHastaMs = null;
    }
    tx.update(accessRef, { testId: currentTest, fueraHastaMs, hastaMs: now + GRACIA_MS });
    tx.update(patientRef, { sesionHasta: admin.firestore.Timestamp.fromMillis(now + GRACIA_MS) });
    return { estado: "activa", testAbandonado, fueraHastaMs };
  });
}

export async function expirarAccesos() {
  const db = admin.firestore();
  // Single-field query; no composite index required. Closed entries are skipped.
  const expired = await db.collection("accesosPaciente").where("estado", "==", "activa").get();
  for (const access of expired.docs) {
    if (access.data().hastaMs <= Date.now()) {
      await operarAcceso(null, { pacienteId: access.id, token: "", accion: "cerrar" }, true);
    }
  }
}
