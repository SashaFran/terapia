import { useEffect, useState } from "react";
import { db } from "../../../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../../components/Boton/Boton";
import styles from "./LoginPaciente.module.css";
import {
  isPacienteAuthenticated,
  setPacienteSession,
} from "../../../utils/pacienteSession";

export default function LoginPaciente() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isPacienteAuthenticated()) {
      navigate("/app/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    const dniLimpio = dni.replace(/\D/g, "");

    try {
      // 🔍 1. Buscar paciente
      const q = query(
        collection(db, "pacientes"),
        where("dni", "==", dniLimpio),
      );
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Paciente no encontrado");
        return;
      }

      const docPaciente = snap.docs[0];
      const pacienteData = docPaciente.data();

      // 🔐 2. Validar password
      if (pacienteData.password !== password) {
        setError("Contraseña incorrecta");
        return;
      }

      // 📦 3. Traer asignaciones
      const qAsignaciones = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", docPaciente.id),
      );

      const snapAsignaciones = await getDocs(qAsignaciones);

      const asignaciones = snapAsignaciones.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 🧠 4. Evaluar acceso (VERSIÓN SANA)
      const ahora = new Date();

      const finRaw = pacienteData.fechaFinAcceso?.toDate?.();

      let accesoVencido = false;

      if (finRaw) {
        // 🔥 FORZAMOS fin de día LOCAL (no UTC)
        const fin = new Date(
          finRaw.getFullYear(),
          finRaw.getMonth(),
          finRaw.getDate(),
          23,
          59,
          59,
          999,
        );

        accesoVencido = ahora.getTime() > fin.getTime();
      }

      const estaInactivo = pacienteData.activo === false;

      // ⚠️ IMPORTANTE: esto ya NO bloquea login
      const total = asignaciones.length;
      const completados = asignaciones.filter(
        (a: any) => a.estado === "completado",
      ).length;

      const testsCompletos = total > 0 && total === completados;
      const dniCargado = !!pacienteData.archivodni;
      const flujoTerminado = testsCompletos && dniCargado;

      console.log("DEBUG LOGIN:", {
        ahora,
        finRaw,
        accesoVencido,
        estaInactivo,
        flujoTerminado,
      });

      // 🚫 5. BLOQUEO REAL (solo lo importante)
      if (accesoVencido || estaInactivo || flujoTerminado) {
        setError("Tu acceso ha expirado.");

        // 🔥 desactivamos en los casos donde aplica
        if ((accesoVencido || flujoTerminado) && pacienteData.activo !== false) {
          try {
            await updateDoc(doc(db, "pacientes", docPaciente.id), {
              activo: false,
            });
          } catch (e) {
            console.error("Error desactivando:", e);
          }
        }

        return;
      }

      // ✅ 6. Login OK (aunque haya terminado flujo)
      const pacienteLogueado = {
        id: docPaciente.id,
        ...pacienteData,
        flujoTerminado, // 👈 útil para UI después
      };

      setPacienteSession(pacienteLogueado, docPaciente.id);

      navigate("/app/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error al intentar ingresar");
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginBox">
        <h2>Ingreso Paciente</h2>

        <div className={styles.form}>
          <input
            placeholder="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña (últimos 6 dígitos del DNI)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <div className="nav">
            <BotonPersonalizado
              variant="primary"
              onClick={handleLogin}
              disabled={!dni || !password}
            >
              Ingresar
            </BotonPersonalizado>
            <BotonPersonalizado
              variant="secondary"
              onClick={() => navigate("/admin/login")}
              disabled={false}
            >
              Ingresar como administrador
            </BotonPersonalizado>
          </div>
        </div>
      </div>
    </div>
  );
}
