import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import styles from "./Sesiones.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";
import ObservacionesModal from "../../components/Modal/ObservacionesModal";
import { generarPdfResultado } from "../../utils/generarPdfResultado";
import { TESTS_REGISTRY } from "../../data/tests";
import { generarPDFClinico } from "../../utils/generarPDFClinico.ts";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { collection, getDocs } from "firebase/firestore";
import { getPaciente } from "../../utils/Helper";
import { descargarInforme } from "../../utils/descargarInforme.ts";
import guardadoIcono from "../../assets/Icons/guardado.svg";

interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
  archivoCaptura?: string; // Ruta de la foto del test
}

interface Paciente {
  id: string;
  nombre: string;
  archivodni?: string; // Ruta del DNI
}

export default function Sesiones() {
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [pacientesMap, setPacientesMap] = useState<Record<string, Paciente>>({});
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<Resultado | null>(null);

  const navigate = useNavigate();

  const formatearFecha = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleOpenModal = (resultado: Resultado) => {
    setSelectedSession(resultado);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const handleSuccessfulSave = (id: string, nuevasObservaciones: string) => {
    setResultados((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, observacionesIniciales: nuevasObservaciones } : r
      )
    );
  };

  useEffect(() => {
    const cargarDatos = async () => {
      const snapResultados = await getDocs(collection(db, "resultados"));
      const resultadosData = snapResultados.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Resultado[];

      const snapPacientes = await getDocs(collection(db, "pacientes"));
      const map: Record<string, Paciente> = {};

      snapPacientes.docs.forEach((d) => {
        const data = d.data();
        map[d.id] = {
          id: d.id,
          nombre: data.nombre,
          archivodni: data.archivodni || data.archivoDNI 
        };
      });

      setResultados(resultadosData);
      setPacientesMap(map);
      setLoading(false);
    };
    cargarDatos();
  }, []);

  // Función corregida para descargar el PDF con fotos
// Función auxiliar para convertir URL a Base64
const urlToBase64 = async (url: string): Promise<string> => {
  // El '?t=' + Date.now() fuerza al navegador a pedir la imagen de nuevo, saltando bloqueos de caché
  const response = await fetch(url + '&t=' + Date.now(), {
    mode: 'cors'
  });
  const blob = await response.blob();
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};




  const totalTests = resultados.length;
  const ultimaFecha = resultados
    .map((r) => r.fecha)
    .filter(Boolean)
    .sort((a, b) => (b.seconds || 0) - (a.seconds || 0))[0] || null;

  if (loading) return <div className="global-container"><h2>Cargando...</h2></div>;

  return (
    <div className={`global-container ${styles.container}`}>
      <div className="nav">
        <h2>Evaluaciones psicológicas</h2>
        <BotonPersonalizado variant="primary" onClick={() => navigate("/app/nueva-sesion")} disabled={false}>
          Nueva sesión
        </BotonPersonalizado>
      </div>

      <nav className={styles.navCards}>
        <div className={styles.card}>
          <h3>Tests realizados</h3>
          <p>{totalTests}</p>
        </div>
        <div className={styles.card}>
          <h3>Último test</h3>
          <p>{ultimaFecha ? formatearFecha(ultimaFecha) : "—"}</p>
        </div>
      </nav>

      <div className={styles.tablaPacientes}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Test</th>
              <th>Nivel</th>
              <th>Paciente</th>
              <th>Comentarios</th>
              <th>Descargar</th>
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr key={r.id}>
                <td>{formatearFecha(r.fecha)}</td>
                <td>{r.testId?.toUpperCase()}</td>
                <td>{r.nivel || "—"}</td>
                <td>
                  {pacientesMap[r.pacienteId || ""]?.nombre || "—"}
                </td>
                <td>
                  <button onClick={() => handleOpenModal(r)}>
                    {r.observacionesIniciales ? "📝 Ver" : "➕ Añadir"}
                  </button>
                </td>
                <td className={styles.descargar}>
                  <button
                    onClick={() => descargarInforme(r, pacientesMap[r.pacienteId || ""])}
                  >
                    <img src={guardadoIcono} alt="Descargar PDF" />
                  </button>
                </td>
              </tr>
            ))}
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
