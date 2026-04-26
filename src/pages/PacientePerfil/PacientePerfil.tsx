import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import {
  addDoc,
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
import EditarPacienteModal from "../../components/Modal/editarPaciente/EditarPacienteModal.tsx";
import ConfirmModal from "../../components/Modal/ConfirmModal/ConfirmModal.tsx";

import styles from "./PacientePerfil.module.css";
import guardadoIcono from "../../assets/Icons/guardado.svg";
import editar from "../../assets/Icons/pen.svg";
import borrar from "../../assets/Icons/trash.svg";
import configuracion from "../../assets/Icons/wrench-circle.svg";

// Utilidades de descarga
import { descargarInforme } from "../../utils/descargarInforme";
import { generarPdfResultado } from "../../utils/generarPdfResultado";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";

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

  const [selectedResultado, setSelectedResultado] = useState<Resultado | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  const [confirmData, setConfirmData] = useState<any>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const abrirConfirm = (config: any) => {
    setConfirmData(config);
  };
  // -------- EFECTOS (Carga de Datos) --------
  useEffect(() => {
    if (!id) return;
    localStorage.setItem("pacienteId", id);

    const loadData = async () => {
      const pacienteSnap = await getDoc(doc(db, "pacientes", id));
      if (pacienteSnap.exists()) {
        setPatient({
          id: pacienteSnap.id,
          ...pacienteSnap.data(),
        } as unknown as Paciente);
      }
      // Cargar Resultados
      const resSnap = await getDocs(
        query(collection(db, "resultados"), where("pacienteId", "==", id)),
      );
      setResultados(
        resSnap.docs.map((d) => ({ id: d.id, ...d.data() })) as Resultado[],
      );

      // Cargar Asignaciones
      const asignSnap = await getDocs(
        query(collection(db, "asignaciones"), where("pacienteId", "==", id)),
      );
      setAsignaciones(
        asignSnap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Asignacion, "id">),
        })) as Asignacion[],
      );
    };

    loadData();
  }, [id]);
  useEffect(() => {
    if (!patient?.id) return;

    const ahora = new Date();

    let fin: Date | null = null;
    if (patient.fechaFinAcceso) {
      fin = patient.fechaFinAcceso.toDate
        ? patient.fechaFinAcceso.toDate()
        : new Date(patient.fechaFinAcceso);
    }

    // 🔥 Si está expirado PERO sigue activo en DB → lo corregimos
    if (fin && ahora > fin && patient.activo === true) {
      const actualizarEstado = async () => {
        try {
          await updateDoc(doc(db, "pacientes", patient.id!), {
            activo: false,
          });

          // 🧠 actualizamos estado local también
          setPatient((prev) => (prev ? { ...prev, activo: false } : prev));
        } catch (error) {
          console.error("Error auto-expirando paciente:", error);
        }
      };

      actualizarEstado();
    }
  }, [patient]);

  useEffect(() => {
    const data = resultados.map((r) => ({
      ...r,
      observacionesIniciales: r.observacionesIniciales || "—",
    }));
    data.sort(
      (a, b) => (b.fecha?.toDate?.() || 0) - (a.fecha?.toDate?.() || 0),
    );
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
      fin = patient.fechaFinAcceso.toDate
        ? patient.fechaFinAcceso.toDate()
        : new Date(patient.fechaFinAcceso);
    }

    // 2. Validaciones en orden
    if (fin && ahora > fin) return "⛔ Expirado";
    if (patient.activo === false) return "⛔ Inactivo";

    if (asignaciones.length === 0) return "🟢 Sin asignar";

    const completados = asignaciones.filter(
      (a) => a.estado === "completado",
    ).length;
    return asignaciones.length === completados ? "✔️ Completado" : "🟢 Activo";
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
    const data = asignaciones.map((a) => ({
      Test: a.testId,
      Estado: a.estado,
      Asignado: formatearFecha(a.fechaAsignacion),
      Completado: formatearFecha(a.fechaCompletado),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tests");
    saveAs(
      new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })]),
      `tests_${patient?.nombre}.xlsx`,
    );
  };

  // -------- MANEJO DE MODALES --------
  const handleOpenModal = (r: Resultado) => {
    setSelectedResultado(r);
    setIsModalOpen(true);
  };
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedResultado(null);
  };

  const handleSuccessfulSave = (
    resultadoId: string,
    nuevasObservaciones: string,
  ) => {
    setTableData((prev) =>
      prev.map((r) =>
        r.id === resultadoId
          ? { ...r, observacionesIniciales: nuevasObservaciones }
          : r,
      ),
    );
    setIsModalOpen(false);
  };

  if (!patient) return <h2>Cargando...</h2>;

  // -------- ACCIÓN CONFIGURACIÓN --------
  const handleGuardarConfig = async (datosActualizados: any) => {
    if (!id) return;

    // 🔥 1. Actualizar paciente
    await updateDoc(doc(db, "pacientes", id), {
      activo: datosActualizados.activo,
      fechaFinAcceso: datosActualizados.fechaFinAcceso,
    });

    // 🔥 2. Sync de tests (ACÁ está la magia)
    const asignSnap = await getDocs(
      query(collection(db, "asignaciones"), where("pacienteId", "==", id)),
    );

    const actuales = asignSnap.docs.map((d) => ({
      id: d.id,
      testId: d.data().testId,
    }));

    const nuevos = datosActualizados.testsSeleccionados.filter(
      (test: string) => !actuales.some((a) => a.testId === test),
    );

    const eliminados = actuales.filter(
      (a) => !datosActualizados.testsSeleccionados.includes(a.testId),
    );

    // Crear nuevos
    await Promise.all(
      nuevos.map((testId: string) =>
        addDoc(collection(db, "asignaciones"), {
          pacienteId: id,
          testId,
          estado: "pendiente",
          fechaAsignacion: new Date(),
        }),
      ),
    );

    // Borrar eliminados
    await Promise.all(
      eliminados.map((a) => deleteDoc(doc(db, "asignaciones", a.id))),
    );

    // 🔥 3. Recargar asignaciones (IMPORTANTE)
    const nuevoSnap = await getDocs(
      query(collection(db, "asignaciones"), where("pacienteId", "==", id)),
    );

    setAsignaciones(
      nuevoSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Asignacion, "id">),
      })) as Asignacion[],
    );
  };
  // -------- UI (RENDER) --------
  return (
    <div className={styles.layout}>
      <div className={"panelVertical"}>
        <div className={`card panelVertical ${styles.cardPaciente}`}>
          <div>
            {" "}
            <div>
              <h2>{patient.nombre}</h2>
              <aside className={styles.sidebar}>
                <p>
                  <strong>DNI:</strong> {patient.dni}
                </p>
                <p>
                  <strong>Estado:</strong> {getEstadoPaciente()}
                </p>
                <p>
                  <strong>Acceso:</strong>{" "}
                  {formatearFecha(patient.fechaInicioAcceso)} →{" "}
                  {formatearFecha(patient.fechaFinAcceso)}
                </p>
              </aside>
            </div>
            <BotonPersonalizado
              variant="primary"
              onClick={() => setIsConfigOpen(true)}
              disabled={false}
            >
              Modificar acceso
            </BotonPersonalizado>
          </div>
          <BotonPersonalizado
            variant="danger"
            onClick={() =>
              abrirConfirm({
                titulo: `Eliminar paciente`,
                mensaje: `¿Eliminar a ${patient.nombre}?`,
                warning:
                  "Se eliminarán también sus asignaciones y evaluaciones.",
                onConfirm: async () => {
                  if (!id) return;
                  setLoadingConfirm(true);

                  try {
                    const asignacionesSnap = await getDocs(
                      query(
                        collection(db, "asignaciones"),
                        where("pacienteId", "==", id),
                      ),
                    );

                    const resultadosSnap = await getDocs(
                      query(
                        collection(db, "resultados"),
                        where("pacienteId", "==", id),
                      ),
                    );

                    await Promise.all([
                      ...asignacionesSnap.docs.map((d) =>
                        deleteDoc(doc(db, "asignaciones", d.id)),
                      ),
                      ...resultadosSnap.docs.map((d) =>
                        deleteDoc(doc(db, "resultados", d.id)),
                      ),
                    ]);

                    await deleteDoc(doc(db, "pacientes", id));
                    navigate("/admin/pacientes");
                  } finally {
                    setLoadingConfirm(false);
                    setConfirmData(null);
                  }
                },
              })
            }
            disabled={false}
          >
            Borrar paciente
          </BotonPersonalizado>
        </div>
      </div>

      <div className={styles.container}>
        <div className={styles.bloqueTabla}>
          <div className={styles.nav}>
            <h3>Tests asignados</h3>
            <BotonPersonalizado
              variant="secondary"
              onClick={exportarExcel}
              disabled={false}
            >
              Excel
            </BotonPersonalizado>
          </div>

          <div className={`scrollbar ${styles.tablaPacientes}`}>
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
                {asignaciones.map((a) => (
                  <tr key={a.id}>
                    <td>{a.testId?.toUpperCase()}</td>
                    <td>{a.estado}</td>
                    <td>{formatearFecha(a.fechaAsignacion)}</td>
                    <td>{formatearFecha(a.fechaCompletado)}</td>
                    <td>
                      <button
                        onClick={() =>
                          abrirConfirm({
                            titulo: "Eliminar asignación",
                            mensaje: `¿Eliminar ${a.testId}?`,
                            onConfirm: async () => {
                              setLoadingConfirm(true);
                              try {
                                await deleteDoc(doc(db, "asignaciones", a.id));
                                setAsignaciones((prev) =>
                                  prev.filter((x) => x.id !== a.id),
                                );
                              } finally {
                                setLoadingConfirm(false);
                                setConfirmData(null);
                              }
                            },
                          })
                        }
                      >
                        <img src={borrar} alt="Borrar record" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 2: Evaluaciones */}
        <div className={styles.bloqueTabla}>
          <div className={styles.nav}>
            <h3>Evaluaciones</h3>
            <BotonPersonalizado
              variant="secondary"
              onClick={descargarZip}
              disabled={false}
            >
              Descargar archivos
            </BotonPersonalizado>
          </div>

          <div className={`scrollbar ${styles.tablaPacientes}`}>
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
                {tableData.map((r) => (
                  <tr key={r.id}>
                    <td>{formatearFecha(r.fecha)}</td>
                    <td>{r.testId}</td>
                    <td>
                      <button onClick={() => handleOpenModal(r)}>
                        <img src={editar} alt="" />
                      </button>
                    </td>
                    <td>
                      <button onClick={() => descargarIndividual(r)}>
                        <img src={guardadoIcono} alt="Descargar PDF" />
                      </button>
                    </td>
                    <td>
                      <button
                        onClick={async () => {
                          if (
                            confirm("¿Eliminar este resultado de evaluación?")
                          ) {
                            await deleteDoc(doc(db, "resultados", r.id)); // 'r' es el item del map
                            // Actualizamos el estado local para que desaparezca de la tabla
                            setResultados((prev) =>
                              prev.filter((item) => item.id !== r.id),
                            );
                          }
                        }}
                      >
                        <img src={borrar} alt="Borrar record" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALES */}
      {isConfigOpen && (
        <EditarPacienteModal
          abierto={isConfigOpen}
          paciente={patient}
          asignacionesActuales={asignaciones.map((a) => a.testId)}
          onCerrar={() => setIsConfigOpen(false)}
          onGuardar={handleGuardarConfig}
        />
      )}
      {confirmData && (
        <ConfirmModal
          abierto={true}
          onCerrar={() => setConfirmData(null)}
          titulo={confirmData.titulo}
          mensaje={confirmData.mensaje}
          warning={confirmData.warning}
          onConfirm={confirmData.onConfirm}
          loading={loadingConfirm}
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
