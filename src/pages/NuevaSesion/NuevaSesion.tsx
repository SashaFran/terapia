import { useEffect, useState } from "react";
import styles from "./NuevaSesion.module.css";
import { db } from "../../firebase/firebase";
import {
  crearSesion,
  mensajeErrorSesion,
} from "../../firebase/sesiones";
import BotonPersonalizado from "../../components/Boton/Boton";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
} from "firebase/firestore";

interface Paciente {
  id: string;
  nombre: string;
}

const TESTS = [
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
    id: "zulliger",
    nombre: "Láminas Zulliger",
    descripcion:
      "Evaluación proyectiva con láminas Zulliger.",
  },
  {
    id: "bender",
    nombre: "Test de Bender",
    descripcion:
      "Evaluación gestáltica visomotora (Bender).",
  },
  {
    id: "raven",
    nombre: "Test de Raven Abreviado",
    descripcion:
      "Evaluación de inteligencia no verbal mediante patrones visuales.",
  },
];

export default function NuevaSesion({
  onClose,
  onPacienteCreado,
}: any) {
  const navigate = useNavigate();

  const cerrar =
    onClose ?? (() => navigate("/admin/sesiones"));

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [pacientes, setPacientes] = useState<Paciente[]>([]);

  const [formData, setFormData] = useState({
    pacienteId: "",
    fecha: "",
    testId: TESTS[0].id,
    observaciones: "",
  });

  useEffect(() => {
    void cargarPacientes();
  }, []);

  const cargarPacientes = async () => {
    try {
      const snap = await getDocs(
        collection(db, "pacientes"),
      );

      const data = snap.docs.map((doc) => ({
        id: doc.id,
        nombre:
          doc.data().nombre || "Sin nombre",
      }));

      setPacientes(data);
    } catch (error) {
      console.error(
        "Error cargando pacientes:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) => {
    const { id, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (saving) return;

    if (!formData.pacienteId) {
      alert("Seleccioná un paciente");
      return;
    }

    if (!formData.fecha) {
      alert("Seleccioná una fecha de evaluación");
      return;
    }

    if (!formData.testId) {
      alert("Seleccioná un test");
      return;
    }

    setSaving(true);

    try {
      const { data } = await crearSesion({
        pacienteId: formData.pacienteId,
        fecha: formData.fecha,
        testId: formData.testId,
        observaciones: formData.observaciones,
      });

      onPacienteCreado?.();

      navigate(
        `/test/${data.testId}?sesion=${data.sesionId}&paciente=${data.pacienteId}`,
      );
    } catch (error) {
      console.error(
        "Error creando sesión:",
        error,
      );

      alert(mensajeErrorSesion(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div
        className={`global-container ${styles.container}`}
      >
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div
      className={`global-container ${styles.container}`}
    >
      <form
        className={styles.form}
        onSubmit={handleSubmit}
      >
        <div className={styles.inputGroup}>
          <h3>
            <label htmlFor="pacienteId">
              Seleccione un paciente
            </label>
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

            {pacientes.map((paciente) => (
              <option
                key={paciente.id}
                value={paciente.id}
              >
                {paciente.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <h3>
            <label htmlFor="fecha">
              Fecha de evaluación
            </label>
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
          <h3>
            <label htmlFor="testId">
              Test a aplicar
            </label>
          </h3>

          <select
            id="testId"
            value={formData.testId}
            onChange={handleChange}
          >
            {TESTS.map((test) => (
              <option
                key={test.id}
                value={test.id}
              >
                {test.nombre}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.inputGroup}>
          <h3>
            <label htmlFor="observaciones">
              Observaciones iniciales
            </label>
          </h3>

          <textarea
            id="observaciones"
            placeholder="Notas previas a la evaluación (opcional)"
            value={formData.observaciones}
            onChange={handleChange}
          />
        </div>
        <div className="nav">
        <BotonPersonalizado
          variant="danger"
          onClick={() => {
            if (confirm("¿Cancelar?")) {
              cerrar();
            }
          }}
          disabled={saving}
        >
          Cancelar
        </BotonPersonalizado>
        <BotonPersonalizado
          variant="primary"
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Creando sesión…"
            : "Comenzar evaluación"}
        </BotonPersonalizado>
        </div>
      </form>
    </div>
  );
}