import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Selector from "./pages/Selector/Selector";

import { Outlet } from "react-router-dom";

import AdminDashboard from "./pages/Dashboard/Dashboard";
import AdminPacientes from "./pages/Pacientes/Pacientes";
import AdminPacientePerfil from "./pages/PacientePerfil/PacientePerfil";
import AdminSesiones from "./pages/Sesiones/Sesiones";
import NuevoPaciente from "./pages/NuevoPaciente/NuevoPaciente";

import LoginPaciente from "./pages/Paciente/LoginPaciente/LoginPaciente";
import PacienteDashboard from "./pages/Paciente/DashboardPaciente/DashboardPaciente";
import PacienteTests from "./pages/Paciente/TestsPaciente/TestsPaciente";
import SubirDNI from "./pages/Paciente/SubirDNI/SubirDNI";

import LoginAdmin from "./pages/Login/Login";
import { AuthProvider } from "./context/AuthContext";
import PrivateAdminRoute from "./routes/PrivateAdminRoute";
import PrivatePacienteRoute from "./routes/PrivatePacienteRoute";

import Sidebar from "./components/Sidebar/Sidebar";
import BreadcrumbsNav from "./components/Breadcrumbs/HeaderInfo";
import TestRunner from "./pages/TestRunner/TestRunner";
import Footer from "./components/Footer/Footer"

import styles from "./App.module.css";

export default function App() {
  
  return (
    <BrowserRouter basename="/">
      <AuthProvider>
        <Routes>

          
          <Route path="/" element={<Selector />} />

          <Route path="/login" element={<LoginPaciente />} />
          <Route path="/admin/login" element={<LoginAdmin />} />

          
          <Route path="/app/*" element={<PrivatePacienteRoute />}>
  
              
              <Route
                element={
                  <div className={styles.layout}>
                    <Sidebar />
                    <BreadcrumbsNav />
                    <div className={styles.mainArea}>
                      <main className={styles.mainContent}>
                        
                        <Outlet />
                      </main>
                    </div>
                    <Footer/>
                  </div>
                }
              >
                
                <Route path="dashboard" element={<PacienteDashboard />} />
                <Route path="dni" element={<SubirDNI />} />
                <Route path="tests" element={<PacienteTests />} />
                <Route path="test/:testId" element={<TestRunner />} />

                
                <Route path="*" element={<Navigate to="dashboard" replace />} />
              </Route>
            </Route>

          
          <Route
            path="/admin/*"
            element={
              <PrivateAdminRoute>
                <div className={styles.layout}>
                  <Sidebar />
                  <BreadcrumbsNav />
                  <div className={styles.mainArea}>
                    
                      <main className={`${styles.mainContent}`}>
                      <Routes>
                        <Route path="dashboard" element={<AdminDashboard />} />
                        <Route path="pacientes" element={<AdminPacientes />} />
                        <Route path="paciente/:id" element={<AdminPacientePerfil />} />
                        <Route path="nuevo-paciente" element={<NuevoPaciente />} />
                        <Route path="sesiones" element={<AdminSesiones />} />
                        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                      </Routes>
                    </main>
                  </div>
                  <Footer/>
                </div>
              </PrivateAdminRoute>
            }
          />

        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}