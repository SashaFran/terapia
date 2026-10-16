import { browserLocalPersistence, inMemoryPersistence, setPersistence, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { auth, firebaseConfig } from "../firebase/firebase";
import { clearPacienteSession, setPacienteSession } from "./pacienteSession";

const esDesarrollo = import.meta.env.DEV;
const MASTER_KEY = "join_master_access_v1";
type Session = { pacienteId: string; token: string };
type Status = { inicioTestMs?: number | null; active: boolean; restoring: boolean; master: boolean; testId: string | null; awayUntil: number | null; message: string; connectionLost: boolean };
let session: Session | null = null;
let status: Status = { active: false, restoring: true, master: false, testId: null, inicioTestMs: null, awayUntil: null, message: "", connectionLost: false };
const listeners = new Set<() => void>();
const functions = getFunctions(auth.app);
type StartResult = { inicioTestMs?: number | null; id: string; esPacienteMaestro?: boolean; testId?: string | null; [key: string]: unknown };
const startCall = httpsCallable<{ token: string }, StartResult>(functions, "iniciarAccesoPaciente");
const actionCall = httpsCallable<Record<string, unknown>, { estado: string; testAbandonado?: string; fueraHastaMs?: number | null; inicioTestMs?: number | null }>(functions, "actualizarAccesoPaciente", { timeout: 20000 });
let cleanup: (() => void) | null = null;
let audio: AudioContext | null = null;
let lastContact = 0;
let queue: Promise<unknown> = Promise.resolve();
let pendingAbandon: string | null = null;
let checkActivity: (() => void) | null = null;
const emit = (change: Partial<Status>) => { status = { ...status, ...change }; listeners.forEach(fn => fn()); };
export const accessStore = { subscribe: (fn: () => void) => { listeners.add(fn); return () => { listeners.delete(fn); }; }, snapshot: () => status };
export const hasPatientAccess = () => session !== null && status.active;
export const isMasterPatient = () => status.active && status.master;

function clearAccess(message: string) {
  cleanup?.(); cleanup = null;
  session = null; pendingAbandon = null;
  localStorage.removeItem(MASTER_KEY);
  clearPacienteSession();
  void signOut(auth).catch(() => {});
  emit({ active: false, restoring: false, master: false, testId: null, inicioTestMs: null, awayUntil: null, message, connectionLost: false });
}
export function closeBeacon() {
  if (!session || status.master) return;
  const body = JSON.stringify(session);
  const url = `https://us-central1-${firebaseConfig.projectId}.cloudfunctions.net/cerrarAccesoPaciente`;
  let sent = false;
  try { sent = navigator.sendBeacon(url, new Blob([body], { type: "text/plain" })); } catch { /* fallback */ }
  if (!sent) void fetch(url, { method: "POST", body, headers: { "Content-Type": "text/plain" }, keepalive: true }).catch(() => {});
}
export function accessAction(accion: string, extra: Record<string, unknown> = {}) {
  const requestSession = session;
  const run = async () => {
    if (!requestSession || session !== requestSession) throw new Error("No hay una sesión de evaluación activa.");
    const { data } = await actionCall({ ...requestSession, accion, ...extra });
    if (session !== requestSession) return data;
    lastContact = Date.now(); emit({ connectionLost: false });
    if (data.estado !== "activa") clearAccess(status.master ? "Sesión de pruebas cerrada." : "Su sesión finalizó. El acceso quedó inhabilitado; contacte a administración si necesita asistencia.");
    else if (data.testAbandonado) emit({ testId: null, awayUntil: null, message: "La evaluación se marcó como abandonada y no puede retomarse." });
    else if (data.fueraHastaMs !== undefined) emit({ awayUntil: data.fueraHastaMs });
    return data;
  };
  const promise = queue.then(run); queue = promise.catch(() => {}); return promise;
}
function reportFailure() {
  emit({ connectionLost: true });
  if (Date.now() - lastContact >= 120000) {
    if (!status.master) closeBeacon();
    clearAccess(status.master ? "La conexión se perdió. Ingresá nuevamente para recuperar la sesión de pruebas." : "No se pudo mantener la conexión. El acceso quedó bloqueado. Contacte a administración.");
  }
}
function warnSound() {
  if (!audio || audio.state !== "running") return;
  const oscillator = audio.createOscillator(); const gain = audio.createGain();
  oscillator.connect(gain); gain.connect(audio.destination); oscillator.frequency.value = 660;
  gain.gain.setValueAtTime(0.08, audio.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.35);
  oscillator.start(); oscillator.stop(audio.currentTime + 0.35);
}
function attachLifecycle() {
  cleanup?.();
  let hidden = false; let observedTest: string | null = null;
  const activity = () => {
    if (status.master) return;
    if (observedTest !== status.testId) { hidden = false; observedTest = status.testId; }
    if (!status.testId) return;
    const away = document.visibilityState === "hidden" || !document.hasFocus();
    if (away === hidden) return;
    hidden = away;
    if (away) { emit({ awayUntil: status.awayUntil ?? Date.now() + 120000 }); warnSound(); void accessAction("fuera").catch(reportFailure); }
    else void accessAction("volver").catch(reportFailure);
  };
  const pagehide = () => {
    if (esDesarrollo || status.master) return;
    closeBeacon(); clearAccess("La sesión se cerró. Contacte a administración si necesita volver a ingresar.");
  };
  const beforeunload = (event: BeforeUnloadEvent) => {
    if (esDesarrollo || status.master || !session || !status.testId) return;
    event.preventDefault(); event.returnValue = "";
  };
  const interval = window.setInterval(() => {
    if (!session) return;
    if (Date.now() - lastContact >= 120000) { reportFailure(); return; }
    if (pendingAbandon) void abandonPatientTest(pendingAbandon).catch(reportFailure);
    else void accessAction("latido").catch(reportFailure);
  }, 15000);
  checkActivity = activity;
  window.addEventListener("pagehide", pagehide); window.addEventListener("beforeunload", beforeunload);
  window.addEventListener("blur", activity); window.addEventListener("focus", activity);
  document.addEventListener("visibilitychange", activity);
  cleanup = () => {
    checkActivity = null; clearInterval(interval);
    window.removeEventListener("pagehide", pagehide); window.removeEventListener("beforeunload", beforeunload);
    window.removeEventListener("blur", activity); window.removeEventListener("focus", activity);
    document.removeEventListener("visibilitychange", activity);
  };
}
const newToken = () => [...crypto.getRandomValues(new Uint8Array(32))].map(n => n.toString(16).padStart(2, "0")).join("");
let pendingLoginToken: string | null = null;
let restorePromise: Promise<void> | null = null;
export function restorePatientAccess(): Promise<void> {
  if (restorePromise) return restorePromise;
  restorePromise = (async () => {
    try {
      const raw = localStorage.getItem(MASTER_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Session;
      if (!saved || typeof saved.pacienteId !== "string" || !/^[a-f0-9]{64}$/.test(saved.token)) throw new Error("Sesión inválida");
      await auth.authStateReady();
      if (!auth.currentUser) throw new Error("No hay autenticación persistente");
      const { data: patient } = await startCall({ token: saved.token });
      if (patient.esPacienteMaestro !== true || patient.id !== saved.pacienteId) throw new Error("La cuenta no es maestra");
      session = saved; setPacienteSession(patient, patient.id);
      lastContact = Date.now();
      emit({ active: true, master: true, testId: typeof patient.testId === "string" ? patient.testId : null, inicioTestMs: typeof patient.inicioTestMs === "number" ? patient.inicioTestMs : null, awayUntil: null, message: "", connectionLost: false });
      attachLifecycle();
    } catch {
      localStorage.removeItem(MASTER_KEY); clearPacienteSession();
      await signOut(auth).catch(() => {});
    } finally { emit({ restoring: false }); }
  })();
  return restorePromise;
}
void restorePatientAccess();
export async function loginPatient(dni: string, password: string) {
  await restorePatientAccess();
  if (session) clearAccess("");
  // Only the server can grant master status. Use in-memory authentication for all other accounts.
  await setPersistence(auth, inMemoryPersistence);
  await signInWithEmailAndPassword(auth, `${dni}@paciente.com`, password);
  pendingLoginToken ??= newToken();
  try {
    const { data: patient } = await startCall({ token: pendingLoginToken });
    const master = patient.esPacienteMaestro === true;
    if (master) await setPersistence(auth, browserLocalPersistence);
    session = { pacienteId: patient.id, token: pendingLoginToken };
    if (master) localStorage.setItem(MASTER_KEY, JSON.stringify(session));
    else localStorage.removeItem(MASTER_KEY);
    pendingLoginToken = null;
    setPacienteSession(patient, patient.id);
    lastContact = Date.now();
    emit({ active: true, restoring: false, master, testId: master && typeof patient.testId === "string" ? patient.testId : null, inicioTestMs: master && typeof patient.inicioTestMs === "number" ? patient.inicioTestMs : null, awayUntil: null, message: "", connectionLost: false });
    attachLifecycle();
  } catch (error) { await signOut(auth).catch(() => {}); throw error; }
}
export async function logoutPatient() {
  if (!session) return;
  if (!status.master) closeBeacon();
  try { await accessAction("cerrar"); }
  finally { clearAccess(status.master ? "Sesión de pruebas cerrada." : "Su sesión finalizó y el acceso quedó inhabilitado."); }
}
export async function beginPatientTest(testId: string) {
  if (status.master && status.testId === testId) return;
  if (pendingAbandon || status.testId) throw new Error("Espere a que finalice la evaluación anterior.");
  if (!navigator.mediaDevices?.getUserMedia) throw new Error("Necesita una computadora con cámara y un navegador compatible.");
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
  stream.getTracks().forEach(track => track.stop());
  try { audio ??= new AudioContext(); await audio.resume(); } catch { /* visual warning */ }
  const result = await accessAction("iniciarTest", { testId });
  if (result.estado !== "activa" || result.testAbandonado) throw new Error("La evaluación no está disponible.");
  emit({ testId, inicioTestMs: typeof result.inicioTestMs === "number" ? result.inicioTestMs : Date.now(), message: "", awayUntil: null }); checkActivity?.();
}
export async function abandonPatientTest(testId: string) {
  if (status.testId !== testId) { if (pendingAbandon === testId) pendingAbandon = null; return; }
  pendingAbandon = testId;
  await accessAction("abandonarTest", { testId }); pendingAbandon = null;
  emit({ testId: null, awayUntil: null, message: "La evaluación quedó abandonada y no puede retomarse." });
}
export async function finishPatientTest(testId: string, resultado: unknown, onSaved?: () => void) {
  const data = await accessAction("finalizarTest", { testId, resultado });
  if (data.estado !== "activa" || data.testAbandonado) throw new Error("La evaluación quedó bloqueada.");
  onSaved?.(); emit({ testId: null, awayUntil: null, message: "" });
}

