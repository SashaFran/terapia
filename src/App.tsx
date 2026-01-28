import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard/Dashboard";
import Pacientes from "./pages/Pacientes/Pacientes";
import PacientePerfil from "./pages/PacientePerfil/PacientePerfil.tsx";
import NuevaSesion from "./pages/NuevaSesion/NuevaSesion";
import Sesiones from "./pages/Sesiones/Sesiones";
import Login from "./pages/Login/Login.tsx";

import PrivateRoute from "./routes/PrivateRoute";
import { AuthProvider } from "./context/AuthContext";

import Sidebar from "./components/Sidebar/Sidebar";
import BreadcrumbsNav from "./components/Breadcrumbs/BreadcrumbsNav.tsx";

import styles from "./App.module.css";
import NuevoPaciente from "./pages/NuevoPaciente/NuevoPaciente";
import TestK10 from "./components/Tests/TestK10/TestK10.tsx";
import TestRunner from "./pages/TestRunner/TestRunner.tsx";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>

          {/* -------- LOGIN (PUBLICO) -------- */}
          <Route path="/login" element={<Login />} />

          {/* -------- APP PROTEGIDA -------- */}
          <Route
            path="/*"
            element={
              <PrivateRoute>
                <div className={styles.layout}>
                  <Sidebar />
                  <div className={styles.mainArea}>
                    <main className={styles.mainContent}>
                      <BreadcrumbsNav />

                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/nuevo-paciente" element={<NuevoPaciente />} />
                        <Route path="/pacientes" element={<Pacientes />} />
                        <Route path="/paciente/:id" element={<PacientePerfil />} />
                        <Route path="/perfil/:id" element={<PacientePerfil />} />
                        <Route path="/sesiones" element={<Sesiones />} />
                        <Route path="/nueva-sesion" element={<NuevaSesion />} />
                        <Route path="/nueva-sesion/:id" element={<NuevaSesion />} />
                        <Route path="*" element={<Navigate to="/" />} />
                        <Route path="/test/:testId" element={<TestRunner />} />
                      </Routes>
                    </main>
                  </div>
                </div>
              </PrivateRoute>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

