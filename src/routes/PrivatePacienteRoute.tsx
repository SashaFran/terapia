import { Navigate, Outlet } from "react-router-dom";
import {
  isPacienteAuthenticated,
  getPacienteSession,
} from "../utils/pacienteSession";

function convertirFecha(fecha: any): Date | null {
  if (!fecha) return null;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const date = new Date(fecha);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export default function PrivatePacienteRoute() {
  if (!isPacienteAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const paciente = getPacienteSession();

  if (!paciente) {
    return <Navigate to="/login" replace />;
  }

  const ahora = new Date();

  const inicio = convertirFecha(
    paciente.fechaInicioAcceso,
  );

  const fin = convertirFecha(
    paciente.fechaFinAcceso,
  );

  // Todavía no comenzó el período de acceso.
  if (inicio && ahora < inicio) {
    localStorage.removeItem("paciente");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("rol");

    return <Navigate to="/login" replace />;
  }

  // Ya terminó el período de acceso.
  if (fin && ahora >= fin) {
    localStorage.removeItem("paciente");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("rol");

    return <Navigate to="/login" replace />;
  }

  // Paciente desactivado manualmente.
  if (paciente.activo === false) {
    localStorage.removeItem("paciente");
    localStorage.removeItem("pacienteId");
    localStorage.removeItem("rol");

    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}