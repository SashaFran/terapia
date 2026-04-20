import { useState } from "react";
import { auth } from "../../firebase/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import styles from "./NuevoPaciente.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";
import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();
const crearPacienteAuth = httpsCallable(functions, "crearPacienteAuth");


// 🧠 Tests disponibles
const TESTS_DISPONIBLES = [
  {
    id: "k10",
    nombre: "Escala de malestar psicológico K-10",
    descripcion:
      "Cuestionario de 10 preguntas sobre ansiedad y depresión en el último mes.",
  },
  {
    id: "bfq",
    nombre: "Escala de Personalidad BFQ",
    descripcion:
      "Evalúa cinco dimensiones de la personalidad.",
  },
   {
    id: "laminas",
    nombre: "Escala de Láminas Zulliger y Bender",
    descripcion:
      "Evaluación proyectiva con láminas visuales.",
  },
  {
    id: "raven",
    nombre: "Test de Raven Abreviado",
    descripcion:
      "Evaluación de inteligencia no verbal mediante patrones visuales.",
  },
];

export default function NuevoPaciente() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    contacto: "",
  });

  const [testsSeleccionados, setTestsSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // -----------------------
  // Contraseña
  // -----------------------
  const generarPassword = (dni: string) => {
    // Quitamos espacios o puntos por las dudas
    const dniLimpio = dni.trim().replace(/\D/g, ""); 
    return dniLimpio.slice(-4);
  };

  // -----------------------
  // Inputs
  // -----------------------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // -----------------------
  // Checkbox toggle
  // -----------------------
  const toggleTest = (testId: string) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter((t) => t !== testId)
        : [...prev, testId]
    );
  };

  // -----------------------
  // Guardar paciente
  // -----------------------

    // ✅ VALIDACIONES PRIMERO
const guardarPaciente = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);

  try {
    const dniLimpio = formData.dni.trim().replace(/\D/g, "");
    const email = `${dniLimpio}@paciente.com`;
    const passwordAutomatica = dniLimpio.slice(-4);
    const ahora = new Date();

    // ✅ 1. VALIDACIONES
    if (dniLimpio.length < 4) {
      alert("El DNI debe tener al menos 4 números");
      setLoading(false);
      return;
    }

    // 🔑 2. CREAR CUENTA EN FIREBASE AUTH
    // Al hacer esto, tu sesión de Admin se "pisa" con la del Paciente nuevo temporalmente
    const userCredential = await createUserWithEmailAndPassword(auth, email, passwordAutomatica);
    const uid = userCredential.user.uid;

    // 🧠 3. GUARDAR PACIENTE EN FIRESTORE (¡Hacer esto ANTES del signOut!)
    const pacienteRef = await addDoc(collection(db, "pacientes"), {
      uid: uid, 
      nombre: formData.nombre,
      dni: dniLimpio,
      password: passwordAutomatica,
      contacto: formData.contacto,
      activo: true,
      accesoUtilizado: false,
      fechaInicioAcceso: Timestamp.fromDate(ahora),
      fechaFinAcceso: Timestamp.fromDate(new Date(ahora.getTime() + 24 * 60 * 60 * 1000)),
      archivoDNI: "",
      createdAt: Timestamp.now(),
    });

    // 🧠 4. ASIGNACIONES
    const promesas = testsSeleccionados.map((testId) =>
      addDoc(collection(db, "asignaciones"), {
        pacienteId: uid, 
        testId,
        estado: "pendiente",
        fechaAsignacion: Timestamp.fromDate(ahora),
        fechaCompletado: null,
      })
    );
    await Promise.all(promesas);

    // 🚪 5. AHORA SÍ: CERRAR SESIÓN DEL PACIENTE
    // Esto limpia la sesión para que puedas volver a entrar como Admin
    await signOut(auth);

    alert(`✅ Paciente creado!\nDNI: ${dniLimpio}\nClave: ${passwordAutomatica}`);
    navigate("/admin/pacientes");

  } catch (error: any) {
    console.error("ERROR AL CREAR:", error);
    if (error.code === "auth/email-already-in-use") {
      alert("Este DNI ya está registrado como paciente.");
    } else {
      alert("Error: " + (error.message || "No se pudo crear el acceso."));
    }
  } finally {
    setLoading(false);
  }
};
}