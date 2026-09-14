import { Navigate, Outlet } from "react-router-dom";
import { isPacienteAuthenticated, getPacienteSession } from "../utils/pacienteSession";

export default function PrivatePacienteRoute({ children }: any) {
  // Validar que exista la sesión del paciente y que sea válida
  if (!isPacienteAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Validar que el paciente aún esté activo (no expirado)
  const paciente = getPacienteSession();
  if (paciente) {
    const ahora = new Date();
    const fin = paciente.fechaFinAcceso?.seconds
      ? new Date(paciente.fechaFinAcceso.seconds * 1000)
      : paciente.fechaFinAcceso ? new Date(paciente.fechaFinAcceso) : null;

    if (fin && ahora > fin) {
      // Si la sesión expiró, limpiar y redirigir
      localStorage.removeItem("paciente");
      localStorage.removeItem("pacienteId");
      localStorage.removeItem("rol");
      return <Navigate to="/login" replace />;
    }
  }

  return <Outlet />;
}