import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import styles from "./Sesiones.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";
import ObservacionesModal from "../../components/Modal/ObservacionesModal";

import { generarPdfResultado } from "../../utils/generarPdfResultado";
import { TESTS_REGISTRY } from "../../data/tests";
import { generarPDFClinico } from "../../utils/generarPDFClinico.ts";

import { collection, getDocs } from "firebase/firestore";

interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
}

interface Paciente {
  id: string;
  nombre: string;
}

export default function Sesiones() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [pacientesMap, setPacientesMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Resultado | null>(
    null,
  );

  const navigate = useNavigate();

  // -------------------------------
  // Helpers
  // -------------------------------
  const formatearFecha = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  // 👈 Función para abrir el modal con la sesión correcta
  const handleOpenModal = (resultado: Resultado) => {
    setSelectedSession(resultado);
    setIsModalOpen(true);
  };

  // 👈 Función para cerrar el modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null); // Limpiamos la sesión seleccionada al cerrar
  };

  // 👈 Función callback para actualizar el estado local cuando se guarda en el modal
  const handleSuccessfulSave = (id: string, nuevasObservaciones: string) => {
    setResultados((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, observacionesIniciales: nuevasObservaciones } : r,
      ),
    );
  };

  // -------------------------------
  // Cargar resultados + pacientes
  // -------------------------------
  useEffect(() => {
    const cargarDatos = async () => {
      // 🔹 Resultados
      const snapResultados = await getDocs(collection(db, "resultados"));
      const resultadosData = snapResultados.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Resultado[];

      // 🔹 Pacientes
      const snapPacientes = await getDocs(collection(db, "pacientes"));
      const pacientesData = snapPacientes.docs.map((d) => ({
        id: d.id,
        ...(d.data() as { nombre: string }),
      })) as Paciente[];

      // 🔹 Map pacienteId → nombre
      const map: Record<string, string> = {};
      pacientesData.forEach((p) => {
        map[p.id] = p.nombre;
      });

      setResultados(resultadosData);
      setPacientesMap(map);
      setLoading(false);
    };

    cargarDatos();
  }, []);

  // -------------------------------
  // Métricas
  // -------------------------------
  const totalTests = resultados.length;

  const ultimaFecha =
    resultados
      .map((r) => r.fecha)
      .filter(Boolean)
      .sort((a, b) => b.seconds - a.seconds)[0] || null;

  // -------------------------------
  // Render
  // -------------------------------
  if (loading) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando evaluaciones…</h2>
      </div>
    );
  }
 const descargarPDF = (resultado: any) => {
  const testConfig = TESTS_REGISTRY[resultado.testId];

  if (!testConfig) {
    alert("Test no soportado todavía");
    return;
  }

  // 🧠 Detectar BFQ vs otros tests
  const isBFQ = resultado.testId === "bfq";

  const resumen = testConfig.generarResumenClinico({
    pacienteNombre: pacientesMap[resultado.pacienteId ?? ""] || "Paciente",
    score: isBFQ ? resultado.dimensiones : resultado.score, // 🔥 clave
    nivel: resultado.nivel,
    fecha: resultado.fecha?.toDate
      ? resultado.fecha.toDate()
      : new Date(),
  });

  generarPDFClinico({
    titulo: `Informe Clínico – ${testConfig.nombre}`,
    contenido: resumen,
    nombrePaciente: pacientesMap[resultado.pacienteId || ""] || "Paciente",
  });
};
  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>Evaluaciones psicológicas</h2>
        <div className={styles.navButtons}>
          <BotonPersonalizado
            variant="primary"
            onClick={() => navigate("/app/nueva-sesion")}
            disabled={false}
          >
            Nueva sesión
          </BotonPersonalizado>
        </div>
      </div>
      {/* CARDS */}
      <nav className={styles.navCards}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Tests realizados</h3>
          <p className={styles.cardResult}>{totalTests}</p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Último test</h3>
          <p className={styles.cardResult}>
            {ultimaFecha ? formatearFecha(ultimaFecha) : "—"}
          </p>
        </div>
      </nav>

      {/* TABLA */}
      <div className={styles.tablaPacientes}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Test</th>
              <th>Nivel</th>
              <th className={styles.paciente}>Paciente</th>
              <th className={styles.comentarios}>Comentarios</th>
              <th className={styles.descargar}>Descargar</th>
            </tr>
          </thead>

          <tbody>
            {resultados.map((r) => (
              <tr key={r.id}>
                <td>{formatearFecha(r.fecha)}</td>
                <td>{r.testId?.toUpperCase() || "—"}</td>
                <td>{r.nivel || "—"}</td>

                <td>
                  {r.pacienteId ? (
                    <button
                      className={styles.linkPaciente}
                      onClick={() => navigate(`/admin/perfil/${r.pacienteId}`)}
                    >
                      {pacientesMap[r.pacienteId] || "Paciente"} 🔗
                    </button>
                  ) : (
                    "—"
                  )}
                </td>

                <td>
                  <button
                    onClick={() => handleOpenModal(r)}
                    title={r.observacionesIniciales || "Añadir comentario"}
                  >
                    {r.observacionesIniciales ? "📝 Ver/Editar" : "➕ Añadir"}
                  </button>
                </td>

                <td className={styles.descargar}>
                  <button onClick={() => descargarPDF(r)}>⬇️</button>
                  <button
                    onClick={() =>
                      generarPdfResultado({
                        pacienteNombre:
                          pacientesMap[r.pacienteId] || "Paciente",
                        resultado: r,
                      })
                    }
                  >
                    ⬇️
                  </button>
                </td>
              </tr>
            ))}

            {resultados.length === 0 && (
              <tr>
                <td colSpan={6}>No hay evaluaciones registradas</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <ObservacionesModal
        abierto={isModalOpen}
        onCerrar={handleCloseModal}
        sesion={selectedSession}
        onGuardarExitoso={handleSuccessfulSave}
      />
    </div>
  );
}
