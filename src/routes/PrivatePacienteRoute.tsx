import { Navigate, Outlet } from "react-router-dom";

export default function PrivatePacienteRoute({ children }: any) {
  const rol = localStorage.getItem("rol");

  if (rol !== "paciente") {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}