import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { accessStore, closeBeacon, logoutPatient } from "../utils/patientAccess";

export default function PatientSessionNotice() {
  const state = useSyncExternalStore(accessStore.subscribe, accessStore.snapshot);
  const [now, setNow] = useState(Date.now());
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const enteredApp = useRef(false);
  useEffect(() => {
    if (!state.awayUntil) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [state.awayUntil]);
  useEffect(() => {
    if (state.active && pathname.startsWith("/app")) enteredApp.current = true;
    if (state.active && enteredApp.current && !pathname.startsWith("/app")) {
      closeBeacon();
      void logoutPatient().catch(() => {});
    }
    if (!state.active && state.message && pathname.startsWith("/app")) navigate("/login", { replace: true });
    if (!state.active) enteredApp.current = false;
  }, [state.active, state.message, pathname, navigate]);
  const seconds = Math.max(0, Math.ceil(((state.awayUntil ?? now) - now) / 1000));
  if (!state.awayUntil && !state.message && !state.connectionLost) return null;
  return <aside className="session-notice" role="alert">
    {state.connectionLost ? "Se perdió la conexión con el servidor. Verifique su conexión; el acceso se bloqueará si no se restablece en 2 minutos." : state.awayUntil ? <>
      <strong>Regrese a la evaluación.</strong> Si permanece fuera de esta pantalla durante 2 minutos, la evaluación se marcará como abandonada y no podrá retomarla.
      <p>Tiempo restante: <strong>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</strong></p>
    </> : state.message}
  </aside>;
}
