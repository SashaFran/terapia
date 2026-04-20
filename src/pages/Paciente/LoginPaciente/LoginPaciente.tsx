import { useState } from "react";
import { auth, db } from "../../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
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
    // 🔎 1. BUSCAMOS AL PACIENTE EN LA COLECCIÓN POR DNI
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

    // 🔑 2. VALIDAMOS LA CONTRASEÑA MANUALMENTE
    // Comparamos lo que escribió el usuario con el campo 'password' del documento
    if (pacienteData.password !== password) {
      setError("Contraseña incorrecta");
      return;
    }

    // ⛔ 3. VALIDACIÓN DE ESTADO ACTIVO
    if (pacienteData.activo === false) {
      setError("Tu acceso ha sido deshabilitado.");
      return;
    }

    // ⏳ 4. VALIDACIÓN DE FECHA
    const ahora = new Date();
    const fin = pacienteData.fechaFinAcceso?.toDate();
    if (fin && ahora > fin) {
      setError("Tu acceso ha expirado.");
      return;
    }

    // ✅ TODO OK -> GUARDAMOS EN LOCALSTORAGE Y ENTRAR
    const pacienteLogueado = { id: docPaciente.id, ...pacienteData };
    localStorage.setItem("paciente", JSON.stringify(pacienteLogueado));
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