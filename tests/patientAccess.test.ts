import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ action: vi.fn(), login: vi.fn(), beacon: vi.fn() }));
vi.mock("../src/firebase/firebase", () => ({ auth: { app: {} }, firebaseConfig: { projectId: "demo" } }));
vi.mock("firebase/auth", () => ({ inMemoryPersistence: {}, setPersistence: async () => {}, signInWithEmailAndPassword: async () => {}, signOut: async () => {} }));
vi.mock("firebase/functions", () => ({ getFunctions: () => ({}), httpsCallable: (_: unknown, name: string) => name === "iniciarAccesoPaciente" ? mocks.login : mocks.action }));
let client: typeof import("../src/utils/patientAccess");
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers(); vi.setSystemTime(1000000);
  localStorage.clear(); mocks.action.mockReset(); mocks.login.mockReset(); mocks.beacon.mockReset();
  mocks.action.mockImplementation(async (data: { accion: string }) => ({ data: { estado: data.accion === "cerrar" ? "abandonada" : "activa", fueraHastaMs: data.accion === "fuera" ? Date.now() + 120000 : null } }));
  mocks.login.mockResolvedValue({ data: { id: "p1", nombre: "Paciente", activo: true } });
  Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: mocks.beacon.mockReturnValue(true) });
  Object.defineProperty(navigator, "mediaDevices", { configurable: true, value: { getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }) } });
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  client = await import("../src/utils/patientAccess");
});
afterEach(async () => { if (client.hasPatientAccess()) await client.logoutPatient(); vi.useRealTimers(); });
it("uses a memory-only token and closes the whole session on pagehide", async () => {
  await client.loginPatient("12345678", "secret");
  const token = mocks.login.mock.calls[0][0].token;
  expect(token).toMatch(/^[a-f0-9]{64}$/);
  expect(JSON.stringify(localStorage)).not.toContain(token);
  window.dispatchEvent(new Event("pagehide"));
  expect(mocks.beacon).toHaveBeenCalledTimes(1);
  expect(client.hasPatientAccess()).toBe(false);
  expect(localStorage.getItem("paciente")).toBeNull();
});
it("does not start or consume a test when camera permission is denied", async () => {
  await client.loginPatient("12345678", "secret");
  vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(new Error("Permission denied"));
  await expect(client.beginPatientTest("k10")).rejects.toThrow();
  expect(mocks.action).not.toHaveBeenCalled();
});
it("starts the warning on focus loss and cancels it after server confirmation on return", async () => {
  await client.loginPatient("12345678", "secret"); await client.beginPatientTest("k10");
  vi.mocked(document.hasFocus).mockReturnValue(false);
  window.dispatchEvent(new Event("blur"));
  await vi.advanceTimersByTimeAsync(1);
  expect(client.accessStore.snapshot().awayUntil).toBe(1120000);
  vi.mocked(document.hasFocus).mockReturnValue(true);
  window.dispatchEvent(new Event("focus"));
  await vi.advanceTimersByTimeAsync(1);
  expect(client.accessStore.snapshot().awayUntil).toBeNull();
  expect(mocks.action).toHaveBeenCalledWith(expect.objectContaining({ accion: "volver" }));
});

it("marks successful completion before publishing the cleared test state", async () => {
  await client.loginPatient("12345678", "secret"); await client.beginPatientTest("k10");
  let saved = false;
  let abandoned = false;
  const unsubscribe = client.accessStore.subscribe(() => {
    if (!client.accessStore.snapshot().testId && !saved) abandoned = true;
  });
  await client.finishPatientTest("k10", { respuestas: [1] }, () => { saved = true; });
  unsubscribe();
  expect(saved).toBe(true);
  expect(abandoned).toBe(false);
});

it("retries a failed abandonment after navigating away", async () => {
  await client.loginPatient("12345678", "secret"); await client.beginPatientTest("k10");
  mocks.action.mockRejectedValueOnce(new Error("offline"));
  await expect(client.abandonPatientTest("k10")).rejects.toThrow("offline");
  await vi.advanceTimersByTimeAsync(15000);
  expect(client.accessStore.snapshot().testId).toBeNull();
  expect(mocks.action.mock.calls.filter(([data]) => data.accion === "abandonarTest")).toHaveLength(2);
});
