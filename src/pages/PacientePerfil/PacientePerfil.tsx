import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import EditarPacienteModal from "../../components/Modal/EditarPacienteModal.tsx";
import ObservacionesModal from "../../components/Modal/ObservacionesModal.tsx";
import styles from "./PacientePerfil.module.css";
import { generarPdfResultado } from "../../utils/generarPdfResultado.ts";
import { TESTS_REGISTRY } from "../../data/tests/index.ts";
import { generarPDFClinico } from "../../utils/generarPDFClinico.ts";

import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  deleteDoc,
} from "firebase/firestore";

// --- Interfaces ---
interface FilaTablaData {
  resultadoId: string;
  sesionId?: string;
  fecha: any;
  testId: string;
  nivel: string;
  observacionesIniciales: string;
  resultadoRaw: Resultado;
}


interface Paciente {
  nombre: string;
  contacto: string;
  fechaNacimiento?: any;
  fechaIngreso?: any;
  motivo?: string;
  notasIniciales?: string;
}

interface Sesion {
  id: string;
  fecha?: any;
  entornoVR?: string;
  nivelExposicion?: string;
  ansiedadDespues?: string;
  comentariosPaciente?: string;
  observacionesIniciales?: string;
}
interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
  tiempoTotalMs?: number;
  score?: number; // 👈 ESTE CAMPO
}



export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Paciente | null>(null);
  const [sessions, setSessions] = useState<Sesion[]>([]);
  const [resultados, setResultados] = useState<any[]>([]);
  
  // Usaremos estos para la tabla y el modal
  const [tableData, setTableData] = useState<FilaTablaData[]>([]);
  const [selectedResultado, setSelectedResultado] = useState<Resultado | null>(null);

  // Estados de modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // ---------------------------------------
  // Helpers
  // ---------------------------------------
  const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const formatearFecha = (timestamp: any) => {
    if (!timestamp?.toDate) return "N/A";
    return timestamp.toDate().toLocaleDateString("es-AR");
  };

const handleOpenModal = (row: FilaTablaData) => {
  setSelectedResultado(row.resultadoRaw);
  setIsModalOpen(true);
};


  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResultado(null);
  };
const handleSuccessfulSave = (
  resultadoId: string,
  nuevasObservaciones: string
) => {
  setTableData(prev =>
    prev.map(r =>
      r.resultadoRaw.id === resultadoId
        ? {
            ...r,
            observacionesIniciales: nuevasObservaciones,
            resultadoRaw: {
              ...r.resultadoRaw,
              observacionesIniciales: nuevasObservaciones,
            },
          }
        : r
    )
  );

  setSelectedSessionData(null);
  setIsModalOpen(false);
};


  
  
  // ---------------------------------------
  // Cargar datos de Firebase
  // ---------------------------------------
  useEffect(() => {
    if (!id) return;
    // ... (cargarPaciente, cargarSesiones, cargarResultados logic here) ...
    const cargarPaciente = async () => { /* ... */ 
      const ref = doc(db, "pacientes", id);
      const snap = await getDoc(ref);
      if (snap.exists()) setPatient(snap.data());
    };
    const cargarSesiones = async () => { /* ... */ 
       const q = query(collection(db, "sesiones"), where("pacienteId", "==", id));
       const snap = await getDocs(q);
       setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };
    const cargarResultados = async () => { /* ... */ 
      const q = query(collection(db, "resultados"), where("pacienteId", "==", id));
      const snap = await getDocs(q);
      setResultados(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    cargarPaciente();
    cargarSesiones();
    cargarResultados();

  }, [id]);

  // ---------------------------------------
  // Efecto para COMBINAR los datos (JOIN)
  // ---------------------------------------
 useEffect(() => {
const combinedData: FilaTablaData[] = resultados.map(resultado => {
  const sessionMatch = sessions.find(
    session => session.id === resultado.sesionId
  );

  return {
    id: resultado.sesionId, // 👈 ESTE es el id real de sesión
    fecha: resultado.fecha,
    testId: resultado.testId || 'N/A',
    nivel: resultado.nivel || 'N/A',
    observacionesIniciales: sessionMatch?.observacionesIniciales || '—',
    resultadoRaw: resultado,
  };
});


  combinedData.sort((a, b) => {
    if (!a.fecha?.toDate || !b.fecha?.toDate) return 0;
    return b.fecha.toDate() - a.fecha.toDate();
  });

  setTableData(combinedData);
}, [sessions, resultados]);

  // ---------------------------------------
  // Handlers para acciones
  // ---------------------------------------
  const handleEditSave = async () => {
    if (!patient || !id) return;
    await updateDoc(doc(db, "pacientes", id), {
      nombre: patient.nombre,
      contacto: patient.contacto,
    });
    setIsEditModalOpen(false);
  };
  
  const descargarPDF = (rowData: FilaTablaData) => {
    // rowData es FilaTablaData, accedemos a resultadoRaw
    const resultado = rowData.resultadoRaw; 
    if (!resultado.testId || !TESTS_REGISTRY[resultado.testId]) {
  alert("Test no soportado o incompleto");
  return;
}

const testConfig = TESTS_REGISTRY[resultado.testId];

    const duracionFormateada = resultado.tiempoTotalMs 
      ? formatDuration(resultado.tiempoTotalMs) 
      : 'No registrado';

    const resumen = testConfig.generarResumenClinico({
      pacienteNombre: patient?.nombre || "Paciente",
      score: resultado.score!,
      nivel: resultado.nivel!,
      fecha: resultado.fecha?.toDate
        ? resultado.fecha.toDate()
        : new Date(),
      duracionFormateada: duracionFormateada,
    });

    generarPDFClinico({
      titulo: `Informe Clínico – ${testConfig.nombre}`,
      contenido: resumen,
      nombrePaciente: patient?.nombre || "Paciente",
    });
  };

  if (!patient) {
    return <div className="page"><h2>Cargando paciente...</h2></div>;
  }

  return (
    <div className={`global-container ${styles.container}`}>
      {/* Header */}
     <header className={styles.nav}>
        <h2>{patient.nombre}</h2>
        <div className={styles.navButtons}>
            <BotonPersonalizado
                variant="primary"
                onClick={() => setIsEditModalOpen(true)}
                disabled={false}
                >
                Editar paciente
            </BotonPersonalizado>
            <BotonPersonalizado
            variant="danger"
            onClick={async () => {
                if (confirm("¿Eliminar paciente?")) {
                await deleteDoc(doc(db, "pacientes", id));
                navigate("/pacientes");
                }
            }}
            disabled={false}
            >
            Borrar paciente
            </BotonPersonalizado>
        </div>
    </header>
    {/* Info */}
    <div className={styles.perfilInfo}>
      <p><strong>Contacto:</strong> {patient.contacto}</p>
      <p><strong>Fecha nacimiento:</strong> {formatearFecha(patient.fechaNacimiento)}</p>
      <p><strong>Ingreso:</strong> {formatearFecha(patient.fechaIngreso)}</p>
      <p><strong>Motivo:</strong> {patient.motivo || "—"}</p>
      <p><strong>Notas:</strong> {patient.notasIniciales || "—"}</p>
    </div>

    <div className={styles.nav}>
      <h4>Evaluaciones psicológicas</h4>
      <BotonPersonalizado
        variant="primary"
        onClick={() => navigate("/nueva-sesion")}>Nueva sesión
      </BotonPersonalizado>
     </div>

    <div className={styles.tablaPacientes}>
      <table className="tabla">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Test</th>
            <th>Nivel</th>
            <th className={styles.comentarios}>Comentarios</th>
            <th className={styles.descargar}>Descargar</th>
          </tr>
        </thead>

        <tbody>
          {/* Mapeamos sobre tableData, donde r es de tipo FilaTablaData */}
          {tableData.map((r) => (
            <tr key={r.resultadoRaw.id}>
              <td>{formatearFecha(r.fecha)}</td>
              <td>{r.testId?.toUpperCase()}</td>
              <td>{r.nivel}</td>

              <td>
                <button onClick={() => handleOpenModal(r)} title={r.observacionesIniciales || "Añadir comentario"}>
                  {r.observacionesIniciales && r.observacionesIniciales !== '—' ? '📝 Ver/Editar' : '➕ Añadir'}
                </button>
              </td>

             <td className={styles.descargar}>
              {/* Aquí r es FilaTablaData, por lo que funciona correctamente */}
              <button onClick={() => descargarPDF(r)}>⬇️</button>
                <button
              onClick={() => {
                 if (patient && r.resultadoRaw) {
                   generarPdfResultado({
                     pacienteNombre: patient.nombre,
                     resultado: r.resultadoRaw, // r.resultadoRaw es de tipo Resultado
                   });
                 }
              }}
            >
              ⬇️
            </button>
                </td>
                        </tr>
                      ))}
                      {tableData.length === 0 && (
                        <tr>
                          <td colSpan={5}>No hay evaluaciones registradas</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
        <EditarPacienteModal
            abierto={isEditModalOpen}
            paciente={patient}
            onCerrar={() => setIsEditModalOpen(false)}
            onGuardar={handleEditSave}
        />
      <ObservacionesModal
        abierto={isModalOpen}
        onCerrar={handleCloseModal}
        sesion={selectedResultado}
        onGuardarExitoso={handleSuccessfulSave}
      />


    </div>
          );
        }
