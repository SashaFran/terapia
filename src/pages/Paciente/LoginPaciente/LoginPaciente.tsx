import { useState } from "react";
import { auth, db } from "../../../firebase/firebase";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../../components/Boton/Boton";
import styles from "./LoginPaciente.module.css";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";


export default function LoginPaciente() {
  
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const [error, setError] = useState("");

  const handleLogin = async (e: any) => {
    e.preventDefault();
    setError("");

    const dniLimpio = dni.replace(/\D/g, "");

    try {
      const q = query(collection(db, "pacientes"), where("dni", "==", dniLimpio));
      const snap = await getDocs(q);

      if (snap.empty) {
        setError("Paciente no encontrado");
        return;
      }

      const docPaciente = snap.docs[0];
      const pacienteData = docPaciente.data();

      if (pacienteData.password !== password) {
        setError("Contraseña incorrecta");
        return;
      }

      if (pacienteData.activo === false) {
        setError("Tu acceso ha sido deshabilitado.");
        return;
      }
      

      // ⏳ VALIDACIÓN DE FECHA
          // ⏳ 4. VALIDACIÓN DE FECHA (Modo estricto)
    const ahora = new Date();
    const fechaExpiracion = pacienteData.fechaFinAcceso?.toDate ? pacienteData.fechaFinAcceso.toDate() : null;


    console.log("Datos del paciente desde Firebase:", pacienteData);

    if (fechaExpiracion && ahora > fechaExpiracion) {
  // 1. 🛑 BLOQUEO INMEDIATO
  setError("Tu acceso ha expirado.");

  // 2. ⚡ ACTUALIZACIÓN AUTOMÁTICA EN FIREBASE
  // Si todavía figuraba como activo, lo pasamos a false para siempre
    if (pacienteData.activo !== false) {
      try {
        await updateDoc(doc(db, "pacientes", docPaciente.id), {
          activo: false
        });
        console.log("Estado del paciente actualizado a INACTIVO automáticamente.");
      } catch (e) {
        console.error("No se pudo desactivar el estado, pero el acceso igual fue denegado.");
      }
    }
    
    return; // ⛔ Cortamos el login aquí
  }

      // ⛔ VALIDACIÓN EXTRA DE SEGURIDAD (Por si ya estaba en false)
  if (pacienteData.activo === false) {
    setError("Tu acceso ha sido deshabilitado.");
    return;
  }
    
    const pacienteLogueado = { id: docPaciente.id, ...pacienteData };

    localStorage.setItem("paciente", JSON.stringify(pacienteLogueado));
    localStorage.setItem("pacienteId", docPaciente.id); // 💎 ESTA ES LA CLAVE

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