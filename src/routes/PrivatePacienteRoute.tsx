import { Navigate, Outlet } from "react-router-dom";

export default function PrivatePacienteRoute({ children }: any) {
  const rol = localStorage.getItem("rol");
  const pacienteRaw = localStorage.getItem("paciente");
  const paciente = pacienteRaw ? JSON.parse(pacienteRaw) : null;

  if (rol !== "paciente" || paciente?.activo === false) {
    localStorage.removeItem("rol");
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
