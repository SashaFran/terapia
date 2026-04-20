import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function PrivateAdminRoute({ children }: any) {
  const rol = localStorage.getItem("rol");

  if (rol !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}