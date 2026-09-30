import { Navigate, Outlet } from "react-router-dom";
import { hasPatientAccess } from "../utils/patientAccess";

export default function PrivatePacienteRoute() {
  return hasPatientAccess() ? <Outlet /> : <Navigate to="/login" replace />;
}
