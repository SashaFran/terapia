import { useEffect, useState } from "react";
import styles from "./NuevaSesion.module.css";
import { db } from "../../firebase/firebase";
import BotonPersonalizado from "../../components/Boton/Boton";
import { useNavigate } from "react-router-dom";
import { collection, getDocs, addDoc, Timestamp } from "firebase/firestore";

// ----------------------
// Tipos
// ----------------------
interface Paciente {
  id: string;
  nombre: string;
}

// Tests disponibles (por ahora uno)
const TESTS = [
  {
    id: "k10",
    nombre: "Escala de malestar psicológico K-10",
    descripcion:
      "Cuestionario de 10 preguntas sobre ansiedad y depresión en el último mes.",
  },
];

export default function NuevaSesion() {
  const navigate = useNavigate();

  // ----------------------
  // Estados
  // ----------------------
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [formData, setFormData] = useState({
    pacienteId: "",
    fecha: "",
    testId: TESTS[0].id,
    observaciones: "",
  });

  const [currentDate, setCurrentDate] = useState("");

  // ----------------------
  // Efectos
  // ----------------------
  useEffect(() => {
    const today = new Date();
    setCurrentDate(
      today.toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
    );
  }, []);

  useEffect(() => {
    cargarPacientes();
  }, []);

  const cargarPacientes = async () => {
    try {
      const snap = await getDocs(collection(db, "pacientes"));
      const data = snap.docs.map((doc) => ({
        id: doc.id,
        nombre: doc.data().nombre || "Sin nombre",
      }));
      setPacientes(data);
    } catch (error) {
      console.error("Error cargando pacientes:", error);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------
  // Handlers
  // ----------------------
  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    const { id, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.pacienteId || !formData.fecha) return;

    setSaving(true);

    try {
      // 1️⃣ Crear sesión (contenedor)
      const docRef = await addDoc(collection(db, "sesiones"), {
        pacienteId: formData.pacienteId,
        fecha: Timestamp.fromDate(new Date(formData.fecha)),
        testId: formData.testId,
        estado: "en_progreso",
        observacionesIniciales: formData.observaciones || "",
        createdAt: Timestamp.now(),
      });

      // 2️⃣ Navegar al test
      navigate(
        `/test/${formData.testId}?sesion=${docRef.id}&paciente=${formData.pacienteId}`,
      );
    } catch (error) {
      console.error("Error creando sesión:", error);
      alert("Error al crear la sesión");
    } finally {
      setSaving(false);
    }
  };

  // ----------------------
  // Render
  // ----------------------
  if (loading) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div className={`global-container ${styles.container}`}>
      {/* Header */}
      <div className={styles.nav}>
        <h2>Nueva evaluación</h2>
        <BotonPersonalizado
          variant="danger"
          onClick={async () => {
            if (confirm("¿Cancelar?")) {
              navigate("/sesiones");
            }
          }}
          disabled={false}
        >
          Cancelar
        </BotonPersonalizado>
      </div>

      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <h3>
            <label htmlFor="pacienteId">Seleccione un paciente</label>
          </h3>
          <select
            id="pacienteId"
            value={formData.pacienteId}
            onChange={handleChange}
            required
          >
            <option value="" disabled>
              Seleccione
            </option>
            {pacientes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputGroup}>
          <h3>
            <label htmlFor="fecha">Fecha de evaluación</label>
          </h3>
          <input
            type="date"
            id="fecha"
            value={formData.fecha}
            onChange={handleChange}
            required
          />
        </div>
        <div className={styles.inputGroup}>
          {/* Test */}
          <h3>
            <label htmlFor="testId">Test a aplicar</label>
          </h3>
          <select id="testId" value={formData.testId} onChange={handleChange}>
            {TESTS.map((test) => (
              <option key={test.id} value={test.id}>
                {test.nombre}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.inputGroup}>
          {/* Observaciones */}
          <h3>
            <label htmlFor="observaciones">Observaciones iniciales</label>
          </h3>
          <textarea
            id="observaciones"
            placeholder="Notas previas a la evaluación (opcional)"
            value={formData.observaciones}
            onChange={handleChange}
          />
        </div>
        {/* CTA */}
        <BotonPersonalizado variant="primary" type="submit" disabled={saving}>
          {saving ? "Creando sesión…" : "Comenzar evaluación"}
        </BotonPersonalizado>
      </form>
    </div>
  );
}
