import { useAuth } from "../context/AuthContext";
import { Navigate } from "react-router-dom";

export default function PrivateAdminRoute({ children }: any) {
  const { user, loading } = useAuth();
  const rol = localStorage.getItem("rol");

  // Mientras carga la sesión de Firebase, mostrar nada
  if (loading) {
    return <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh'}}>Cargando...</div>;
  }

  // Si no hay usuario autenticado en Firebase ni rol admin, ir a login
  if (!user || rol !== "admin") {
    return <Navigate to="/admin/login" replace />;
  }

  return children;
}