import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

// Componentes y Estilos
import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import ObservacionesModal from "../../components/Modal/ObservacionesModal.tsx";
import styles from "./PacientePerfil.module.css";
import guardadoIcono from "../../assets/Icons/guardado.svg";
import editar from "../../assets/Icons/pen.svg"
import borrar from "../../assets/Icons/trash.svg"
import configuracion from "../../assets/Icons/wrench-circle.svg"

// Utilidades de descarga
import { descargarInforme } from "../../utils/descargarInforme";
import { generarPdfResultado } from "../../utils/generarPdfResultado";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";
import EditarPacienteModal from "../../components/Modal/EditarPacienteModal.tsx";

// -------- INTERFACES --------
interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
  archivoCaptura?: string; // Importante para las fotos
}

interface Paciente {
  id?: string; 
  activo: boolean;
  dni: string;
  nombre: string;
  archivodni: string;
  fechaFinAcceso: any;
  fechaInicioAcceso: any;
}

interface Asignacion {
  id: string;
  testId: string;
  estado: "pendiente" | "completado";
  fechaAsignacion?: any;
  fechaCompletado?: any;
}

export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // -------- ESTADOS --------
  const [patient, setPatient] = useState<Paciente | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  
  const [selectedResultado, setSelectedResultado] = useState<Resultado | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // -------- EFECTOS (Carga de Datos) --------
  useEffect(() => {
    if (!id) return;
    localStorage.setItem("pacienteId", id);

    const loadData = async () => {
      const pacienteSnap = await getDoc(doc(db, "pacientes", id));
      if (pacienteSnap.exists()) {
    setPatient({ id: pacienteSnap.id, ...pacienteSnap.data() } as unknown as Paciente);
  }
      // Cargar Resultados
      const resSnap = await getDocs(query(collection(db, "resultados"), where("pacienteId", "==", id)));
      setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Resultado[]);

      // Cargar Asignaciones
      const asignSnap = await getDocs(query(collection(db, "asignaciones"), where("pacienteId", "==", id)));
      setAsignaciones(asignSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Asignacion[]);
    };

    loadData();
  }, [id]);

  useEffect(() => {
    const data = resultados.map(r => ({
      ...r,
      observacionesIniciales: r.observacionesIniciales || "—"
    }));
    data.sort((a, b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0));
    setTableData(data);
  }, [resultados]);

  // -------- HELPERS --------
  const formatearFecha = (timestamp: any) => {
    if (!timestamp) return "N/A";
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString("es-AR");
    return new Date(timestamp).toLocaleDateString("es-AR");
  };

const getEstadoPaciente = () => {
  if (!patient) return "—";
  
  const ahora = new Date();
  
  // 1. Manejo seguro de fecha nula o Timestamp
  let fin: Date | null = null;
  if (patient.fechaFinAcceso) {
    fin = patient.fechaFinAcceso.toDate ? patient.fechaFinAcceso.toDate() : new Date(patient.fechaFinAcceso);
  }

  // 2. Validaciones en orden
  if (fin && ahora > fin) return "⛔ Expirado";
  if (patient.activo === false) return "⛔ Inactivo";
  
  if (asignaciones.length === 0) return "🟢 Sin asignar";

  const completados = asignaciones.filter(a => a.estado === "completado").length;
  return (asignaciones.length === completados) ? "✔️ Completado" : "🟢 Activo";
};


  // -------- ACCIONES DE DESCARGA --------
  const descargarIndividual = async (r: any) => {
    // Usamos descargarInforme porque ya gestiona las promesas de imágenes correctamente
    await descargarInforme(r, patient); 
  };

  const descargarZip = async () => {
    if (!patient) return;
    const zip = new JSZip();
    
    for (const r of tableData) {
      try {
        const blob = await generarPdfResultado({
          pacienteNombre: "ZIP", // Flag para que la función retorne BLOB y no descargue
          resultado: r,
          fotoDNI: patient.archivodni, 
          fotoCaptura: r.archivoCaptura,
        });

        if (blob instanceof Blob) {
          const nombreArchivo = `${patient.nombre}_${r.testId}_${formatearFecha(r.fecha).replace(/\//g, "-")}.pdf`;
          zip.file(nombreArchivo, blob);
        }
      } catch (error) {
        console.error("Error generando PDF para ZIP:", r.id, error);
      }
    }
    
    const contenidoZip = await zip.generateAsync({ type: "blob" });
    saveAs(contenidoZip, `reportes_${patient.nombre}.zip`);
  };

  const exportarExcel = () => {
    const data = asignaciones.map(a => ({
      Test: a.testId,
      Estado: a.estado,
      Asignado: formatearFecha(a.fechaAsignacion),
      Completado: formatearFecha(a.fechaCompletado),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tests");
    saveAs(new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]), `tests_${patient?.nombre}.xlsx`);
  };

  // -------- MANEJO DE MODALES --------
  const handleOpenModal = (r: Resultado) => {
    setSelectedResultado(r);
    setIsModalOpen(true);
  };
    const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const handleSuccessfulSave = (resultadoId: string, nuevasObservaciones: string) => {
    setTableData(prev => prev.map(r => r.id === resultadoId ? { ...r, observacionesIniciales: nuevasObservaciones } : r));
    setIsModalOpen(false);
  };

  if (!patient) return <h2>Cargando...</h2>;

  // -------- ACCIÓN CONFIGURACIÓN --------
  const handleGuardarConfig = async (datosActualizados: Partial<Paciente>) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, "pacientes", id), datosActualizados);
      setPatient(prev => prev ? { ...prev, ...datosActualizados } : null);
      setIsConfigOpen(false);
    } catch (error) {
      console.error("Error al actualizar paciente:", error);
      alert("No se pudieron guardar los cambios.");
    }
  };

  // -------- UI (RENDER) --------
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div>
          <button className={styles.configuracion}  onClick={() => setIsConfigOpen(true)} ><img src={configuracion} alt=""/></button>
          <h2>{patient.nombre}</h2>
          <aside className={styles.sidebar}>
            <p><strong>DNI:</strong> {patient.dni}</p>
            <p><strong>Estado:</strong> {getEstadoPaciente()}</p>
            <p>
              <strong>Acceso:</strong>{" "}
                {formatearFecha(patient.fechaInicioAcceso)} →{" "}
                {formatearFecha(patient.fechaFinAcceso)}
            </p> 
          </aside>
        </div>
        <BotonPersonalizado
            variant="danger"            
            onClick={async () => {
              if (confirm("¿Eliminar paciente?")) {
                await deleteDoc(doc(db, "pacientes", id!));
                navigate("/admin/pacientes");
              }
            }}
            disabled={false}>   
            Borrar paciente
          </BotonPersonalizado>

      </header>

      <div className={styles.layout}>
        {/* SIDEBAR */}

        {/* CONTENT */}
        <main className={styles.content}>
          {/* TABLA 1: Tests Asignados */}
          <section>
            <div className={styles.navTable}>
              <h3>Tests asignados</h3>
              <BotonPersonalizado variant="secondary" onClick={exportarExcel} disabled={false}>
                Excel
              </BotonPersonalizado>
            </div>

            <div className={styles.tablaPacientes}>
              <table>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Estado</th>
                    <th>Asignado</th>
                    <th>Completado</th>
                    <th>Borrar</th>
                  </tr>
                </thead>
                <tbody>
                  {asignaciones.map(a => (
                    <tr key={a.id}>
                      <td>{a.testId?.toUpperCase()}</td>
                      <td>{a.estado}</td>
                      <td>{formatearFecha(a.fechaAsignacion)}</td>
                      <td>{formatearFecha(a.fechaCompletado)}</td>
                      <td><button onClick={async () => {
                        if (confirm("¿Eliminar este test asignado? Esto también borrará su resultado si existe.")) {
                          try {
                            // 1. Borrar la asignación
                            await deleteDoc(doc(db, "asignaciones", a.id)); // 'a' es el item del map

                            // 2. Borrar el resultado vinculado (si existe)
                            // Buscamos en el estado de resultados si hay uno con el mismo testId
                            const resultadoAsociado = resultados.find(res => res.testId === a.testId);
                            if (resultadoAsociado) {
                              await deleteDoc(doc(db, "resultados", resultadoAsociado.id));
                              setResultados(prev => prev.filter(res => res.id !== resultadoAsociado.id));
                            }

                            // 3. Actualizar estado local de asignaciones para refrescar la tabla y el modal
                            setAsignaciones(prev => prev.filter(item => item.id !== a.id));
                            
                          } catch (error) {
                            console.error("Error al eliminar:", error);
                          }
                        }
                      }}>   
                        <img src={borrar} alt="Borrar record" />
                      </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* TABLA 2: Evaluaciones */}
          <section>
            <div className={styles.navTable}>
              <h3>Evaluaciones</h3>
              <BotonPersonalizado variant="secondary" onClick={descargarZip} disabled={false}>
                Descargar archivos
              </BotonPersonalizado>
            </div>

            <div className={styles.tablaPacientes}>
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Test</th>
                    <th>Comentario</th>
                    <th>PDF</th>
                    <th>Borrar</th>
                  </tr>
                </thead>
                <tbody>
                  {tableData.map(r => (
                    <tr key={r.id}>
                      <td>{formatearFecha(r.fecha)}</td>
                      <td>{r.testId}</td>
                      <td>
                        <button onClick={() => handleOpenModal(r)}>
                          <img src={editar} alt=""/>
                        </button>
                      </td>
                      <td>
                        <button onClick={() => descargarIndividual(r)}>
                          <img src={guardadoIcono} alt="Descargar PDF" />
                        </button>
                      </td>
                      <td>
                        <button onClick={async () => {
                            if (confirm("¿Eliminar este resultado de evaluación?")) {
                              await deleteDoc(doc(db, "resultados", r.id)); // 'r' es el item del map
                              // Actualizamos el estado local para que desaparezca de la tabla
                              setResultados(prev => prev.filter(item => item.id !== r.id));
                            }
                        }}>   
                          <img src={borrar} alt="Borrar record" />
                        </button>

                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* MODALES */}
      {isConfigOpen && (
        <EditarPacienteModal
          abierto={isConfigOpen}
          paciente={patient}
          asignacionesActuales={asignaciones.map(a => a.testId)}
          onCerrar={() => setIsConfigOpen(false)}
          onGuardar={handleGuardarConfig}
        />
      )}

      <ObservacionesModal
        abierto={isModalOpen}
        onCerrar={handleCloseModal}
        sesion={selectedResultado}
        onGuardarExitoso={handleSuccessfulSave}
      />
    </div>
  );
}
function setSelectedSession(arg0: null) {
  throw new Error("Function not implemented.");
}

