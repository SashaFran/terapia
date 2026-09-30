import { inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, firebaseConfig } from "../firebase/firebase";
import { clearPacienteSession, setPacienteSession } from "./pacienteSession";

type Session = { pacienteId: string; token: string };
type Status = { active: boolean; testId: string | null; awayUntil: number | null; message: string; connectionLost: boolean };
let session: Session | null = null;
let status: Status = { active: false, testId: null, awayUntil: null, message: "", connectionLost: false };
const listeners = new Set<() => void>();
const functions = getFunctions(auth.app);
const startCall = httpsCallable<{ token: string }, Record<string, unknown> & { id: string }>(functions, "iniciarAccesoPaciente");
const actionCall = httpsCallable<Record<string, unknown>, { estado: string; testAbandonado?: string; fueraHastaMs?: number | null }>(functions, "actualizarAccesoPaciente", { timeout: 20000 });
let cleanup: (() => void) | null = null;
let audio: AudioContext | null = null;
let lastContact = 0;
let queue: Promise<unknown> = Promise.resolve();
let pendingAbandon: string | null = null;
let checkActivity: (() => void) | null = null;
const emit = (change: Partial<Status>) => { status = { ...status, ...change }; listeners.forEach(fn => fn()); };
export const accessStore = { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, snapshot: () => status };
export const hasPatientAccess = () => session !== null && status.active;

function clearAccess(message: string) {
  cleanup?.(); cleanup = null;
  session = null;
  pendingAbandon = null;
  clearPacienteSession();
  void signOut(auth).catch(() => {});
  emit({ active: false, testId: null, awayUntil: null, message, connectionLost: false });
}

export function closeBeacon() {
  if (!session) return;
  const body = JSON.stringify(session);
  const url = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/cerrarAccesoPaciente`;
  let sent = false;
  try { sent = navigator.sendBeacon(url, new Blob([body], { type: "text/plain" })); } catch { /* fallback below */ }
  if (!sent) void fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => {});
}

export function accessAction(accion: string, extra: Record<string, unknown> = {}) {
  // Serialize transitions so an old focus event cannot overtake a newer one.
  const requestSession = session;
  const run = async () => {
    if (!requestSession || session !== requestSession) throw new Error("No hay una sesión de evaluación activa.");
    const { data } = await actionCall({ ...requestSession, accion, ...extra });
    if (session !== requestSession) return data;
    lastContact = Date.now();
    emit({ connectionLost: false });
    if (data.estado !== "activa") {
      clearAccess("Su sesión finalizó. El acceso quedó inhabilitado; contacte a administración si necesita asistencia.");
    } else if (data.testAbandonado) {
      emit({ testId: null, awayUntil: null, message: "La evaluación se marcó como abandonada y no puede retomarse." });
    } else if (data.fueraHastaMs !== undefined) {
      emit({ awayUntil: data.fueraHastaMs });
    }
    return data;
  };
  const promise = queue.then(run);
  queue = promise.catch(() => {});
  return promise;
}

function reportFailure() {
  emit({ connectionLost: true });
  if (Date.now() - lastContact >= 120000) {
    closeBeacon();
    clearAccess("No se pudo mantener la conexión. El acceso quedó bloqueado. Contacte a administración.");
  }
}

function warnSound() {
  if (!audio || audio.state !== "running") return;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.connect(gain); gain.connect(audio.destination);
  oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.08, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
  oscillator.start(); oscillator.stop(audio.currentTime + 0.35);
}

function attachLifecycle() {
  let hidden = false;
  let observedTest: string | null = null;
  const activity = () => {
    if (observedTest !== status.testId) { hidden = false; observedTest = status.testId; }
    if (!status.testId) return;
    const away = document.visibilityState === "hidden" || !document.hasFocus();
    if (away === hidden) return;
    hidden = away;
    if (away) {
      emit({ awayUntil: status.awayUntil ?? Date.now() + 120000 });
      warnSound();
      void accessAction("fuera").catch(reportFailure);
    } else {
      // Keep the warning until the server confirms that the deadline wasn't exceeded.
      void accessAction("volver").catch(reportFailure);
    }
  };
  const pagehide = () => {
    closeBeacon();
    clearAccess("La ventana de evaluación se cerró. El acceso no puede volver a utilizarse.");
  };
  const beforeunload = (event: BeforeUnloadEvent) => {
    if (!session) return;
    event.preventDefault(); event.returnValue = "";
  };
  const interval = window.setInterval(() => {
    if (!session) return;
    if (Date.now() - lastContact >= 120000) { reportFailure(); return; }
    if (pendingAbandon) void abandonPatientTest(pendingAbandon).catch(reportFailure);
    else void accessAction("latido").catch(reportFailure);
  }, 15000);
  checkActivity = activity;
  window.addEventListener("pagehide", pagehide);
  window.addEventListener("beforeunload", beforeunload);
  window.addEventListener("blur", activity);
  window.addEventListener("focus", activity);
  document.addEventListener("visibilitychange", activity);
  cleanup = () => {
    checkActivity = null;
    clearInterval(interval);
    window.removeEventListener("pagehide", pagehide);
    window.removeEventListener("beforeunload", beforeunload);
    window.removeEventListener("blur", activity);
    window.removeEventListener("focus", activity);
    document.removeEventListener("visibilitychange", activity);
  };
}

let pendingLoginToken: string | null = null;
export async function loginPatient(dni: string, password: string) {
  await setPersistence(auth, inMemoryPersistence);
  await signInWithEmailAndPassword(auth, `${dni}@paciente.com`, password);
  pendingLoginToken ??= [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, "0")).join("");
  const { data: patient } = await startCall({ token: pendingLoginToken });
  session = { pacienteId: patient.id, token: pendingLoginToken };
  pendingLoginToken = null;
  setPacienteSession(patient, patient.id);
  lastContact = Date.now();
  emit({ active: true, testId: null, awayUntil: null, message: "", connectionLost: false });
  attachLifecycle();
}

export async function logoutPatient() {
  if (!session) return;
  closeBeacon();
  try { await accessAction("cerrar"); }
  finally { clearAccess("Su sesión finalizó y el acceso quedó inhabilitado."); }
}

export async function beginPatientTest(testId: string) {
  if (pendingAbandon || status.testId) throw new Error("Espere a que finalice la evaluación anterior.");
  // Ask for camera permission before starting the timer or monitoring focus.
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Necesita una computadora con cámara y un navegador compatible.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getTracks().forEach(track => track.stop());
  try { audio ??= new AudioContext(); await audio.resume(); } catch { /* Visual warning always remains available. */ }
  const result = await accessAction("iniciarTest", { testId });
  if (result.estado !== "activa" || result.testAbandonado) throw new Error("La evaluación no está disponible.");
  emit({ testId, message: "", awayUntil: null });
  checkActivity?.();
}

export async function abandonPatientTest(testId: string) {
  if (status.testId !== testId) { if (pendingAbandon === testId) pendingAbandon = null; return; }
  pendingAbandon = testId;
  await accessAction("abandonarTest", { testId });
  pendingAbandon = null;
  emit({ testId: null, awayUntil: null, message: "La evaluación quedó abandonada y no puede retomarse." });
}

export async function finishPatientTest(testId: string, resultado: unknown, onSaved?: () => void) {
  const data = await accessAction("finalizarTest", { testId, resultado });
  if (data.estado !== "activa" || data.testAbandonado) throw new Error("La evaluación quedó bloqueada.");
  onSaved?.();
  emit({ testId: null, awayUntil: null, message: "" });
}
