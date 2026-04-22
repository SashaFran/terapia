import { useState } from "react";
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

export default function LoginPaciente() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    const dniLimpio = dni.replace(/\D/g, "");

    try {
      // 🔍 1. Buscar paciente
      const q = query(
        collection(db, "pacientes"),
        where("dni", "==", dniLimpio)
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

      // 📦 3. Traer asignaciones (CLAVE)
      const qAsignaciones = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", docPaciente.id)
      );

      const snapAsignaciones = await getDocs(qAsignaciones);

      const asignaciones = snapAsignaciones.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));

      // 🧠 4. Evaluar acceso correctamente
      const ahora = new Date();
      const fin = pacienteData.fechaFinAcceso?.toDate?.();

      const accesoVencido = fin && ahora > fin;
      const estaInactivo = pacienteData.activo === false;

      const total = asignaciones.length;
      const completados = asignaciones.filter(
        (a: any) => a.estado === "completado"
      ).length;

      const testsCompletos = total > 0 && total === completados;
      const dniCargado = !!pacienteData.archivodni;

      const flujoTerminado = testsCompletos && dniCargado;

      // 🚫 5. Bloqueo de acceso
      if (accesoVencido || estaInactivo || flujoTerminado) {
        setError("Tu acceso ha finalizado.");

        // 🔥 Desactivar automáticamente si aún está activo
        if (pacienteData.activo !== false) {
          try {
            await updateDoc(doc(db, "pacientes", docPaciente.id), {
              activo: false,
            });
            console.log("Paciente desactivado automáticamente");
          } catch (e) {
            console.error("No se pudo actualizar el estado", e);
          }
        }

        return;
      }

      // ✅ 6. Login OK
      const pacienteLogueado = {
        id: docPaciente.id,
        ...pacienteData,
      };

      localStorage.setItem("paciente", JSON.stringify(pacienteLogueado));
      localStorage.setItem("pacienteId", docPaciente.id);
      localStorage.setItem("rol", "paciente");

      navigate("/app/dashboard");
    } catch (err) {
      console.error(err);
      setError("Error al intentar ingresar");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2>Ingreso Paciente</h2>

        <div className={styles.form}>
          <input
            placeholder="DNI"
            value={dni}
            onChange={(e) => setDni(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña (últimos 4)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <BotonPersonalizado
            variant="primary"
            onClick={handleLogin}
            disabled={!dni || !password}
          >
            Ingresar
          </BotonPersonalizado>
        </div>
      </div>
    </div>
  );
}