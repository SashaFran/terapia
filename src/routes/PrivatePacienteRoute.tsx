import { useSyncExternalStore } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { accessStore, hasPatientAccess } from "../utils/patientAccess";

export default function PrivatePacienteRoute() {
  const state = useSyncExternalStore(accessStore.subscribe, accessStore.snapshot);
  if (state.restoring) return <main role="status" aria-live="polite">Restaurando sesión...</main>;
  return hasPatientAccess() ? <Outlet /> : <Navigate to="/login" replace />;
}
