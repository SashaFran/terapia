import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
import {
  eliminarPaciente,
  mensajeErrorPaciente,
} from "../../firebase/pacientes";

import Tooltip from "@mui/material/Tooltip";

import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import ObservacionesModal from "../../components/Modal/ObservacionesModal.tsx";
import EditarPacienteModal from "../../components/Modal/editarPaciente/EditarPacienteModal.tsx";
import ConfirmModal from "../../components/Modal/ConfirmModal/ConfirmModal.tsx";
import Modal from "../../components/Modal/Modal";

import styles from "./PacientePerfil.module.css";
import guardadoIcono from "../../assets/Icons/guardado.svg";
import editar from "../../assets/Icons/pen.svg";
import borrar from "../../assets/Icons/trash.svg";

import { generarPdfResultado } from "../../utils/generarPdfResultado";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import JSZip from "jszip";

interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
  archivoCaptura?: string;
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
  estado: "pendiente" | "completado" | "abandono";
  fechaAsignacion?: any;
  fechaCompletado?: any;
}

export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Paciente | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [tableData, setTableData] = useState<Resultado[]>([]);

  const [selectedResultado, setSelectedResultado] =
    useState<Resultado | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [dniModalOpen, setDniModalOpen] = useState(false);

  const [confirmData, setConfirmData] = useState<any>(null);
  const [loadingConfirm, setLoadingConfirm] = useState(false);

  const abrirConfirm = (config: any) => {
    setConfirmData(config);
  };

  useEffect(() => {
    if (!id) return;

    localStorage.setItem("pacienteId", id);

    const loadData = async () => {
      try {
        const pacienteSnap = await getDoc(doc(db, "pacientes", id));

        if (pacienteSnap.exists()) {
          setPatient({
            id: pacienteSnap.id,
            ...pacienteSnap.data(),
          } as unknown as Paciente);
        }

        const resSnap = await getDocs(
          query(
            collection(db, "resultados"),
            where("pacienteId", "==", id),
          ),
        );

        setResultados(
          resSnap.docs.map((d) => ({
            id: d.id,
            ...d.data(),
          })) as Resultado[],
        );

        const asignSnap = await getDocs(
          query(
            collection(db, "asignaciones"),
            where("pacienteId", "==", id),
          ),
        );

        setAsignaciones(
          asignSnap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Asignacion, "id">),
          })) as Asignacion[],
        );
      } catch (error) {
        console.error("Error cargando paciente:", error);
      }
    };

    void loadData();
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

    if (fin && ahora > fin && patient.activo === true) {
      const actualizarEstado = async () => {
        try {
          await updateDoc(doc(db, "pacientes", patient.id!), {
            activo: false,
          });

          setPatient((prev) =>
            prev ? { ...prev, activo: false } : prev,
          );
        } catch (error) {
          console.error("Error auto-expirando paciente:", error);
        }
      };

      void actualizarEstado();
    }
  }, [patient]);

  useEffect(() => {
    const data = resultados.map((r) => ({
      ...r,
      observacionesIniciales: r.observacionesIniciales || "—",
    }));

    data.sort(
      (a, b) =>
        (b.fecha?.toDate?.()?.getTime?.() || 0) -
        (a.fecha?.toDate?.()?.getTime?.() || 0),
    );

    setTableData(data);
  }, [resultados]);

  const formatearFecha = (timestamp: any) => {
    if (!timestamp) return "N/A";

    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString("es-AR");
    }

    return new Date(timestamp).toLocaleDateString("es-AR");
  };

  const getEstadoPaciente = () => {
    if (!patient) return "—";

    const ahora = new Date();

    let fin: Date | null = null;

    if (patient.fechaFinAcceso) {
      fin = patient.fechaFinAcceso.toDate
        ? patient.fechaFinAcceso.toDate()
        : new Date(patient.fechaFinAcceso);
    }

    if (asignaciones.some((a) => a.estado === "abandono")) {
      return "⚠️ Abandono";
    }

    if (fin && ahora > fin) {
      return "⛔ Expirado";
    }

    if (patient.activo === false) {
      return "⛔ Inactivo";
    }

    if (asignaciones.length === 0) {
      return "🟢 Sin asignar";
    }

    const completados = asignaciones.filter(
      (a) => a.estado === "completado",
    ).length;

    return asignaciones.length === completados
      ? "✔️ Completado"
      : "🟢 Activo";
  };

  const descargarIndividual = async (resultado: Resultado) => {
    await generarPdfResultado({
      pacienteNombre: patient?.nombre,
      resultado,
      fotoDNI: patient?.archivodni,
      fotoCaptura: resultado.archivoCaptura,
    });
  };

  const descargarZip = async () => {
    if (!patient) return;

    const zip = new JSZip();

    for (const resultado of tableData) {
      try {
        const blob = await generarPdfResultado({
          pacienteNombre: patient.nombre,
          devolverBlob: true,
          resultado,
          fotoDNI: patient.archivodni,
          fotoCaptura: resultado.archivoCaptura,
        });

        if (blob instanceof Blob) {
          const nombreArchivo =
            `${patient.nombre}_${resultado.testId}_${formatearFecha(
              resultado.fecha,
            ).replace(/\//g, "-")}.pdf`;

          zip.file(nombreArchivo, blob);
        }
      } catch (error) {
        console.error(
          "Error generando PDF para ZIP:",
          resultado.id,
          error,
        );
      }
    }

    const contenidoZip = await zip.generateAsync({
      type: "blob",
    });

    saveAs(
      contenidoZip,
      `reportes_${patient.nombre}.zip`,
    );
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

    XLSX.utils.book_append_sheet(
      wb,
      ws,
      "Tests",
    );

    saveAs(
      new Blob([
        XLSX.write(wb, {
          bookType: "xlsx",
          type: "array",
        }),
      ]),
      `tests_${patient?.nombre}.xlsx`,
    );
  };

  const handleOpenModal = (resultado: Resultado) => {
    setSelectedResultado(resultado);
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
    setResultados((prev) =>
      prev.map((resultado) =>
        resultado.id === resultadoId
          ? {
              ...resultado,
              observacionesIniciales: nuevasObservaciones,
            }
          : resultado,
      ),
    );

    setIsModalOpen(false);
  };

  const handleGuardarConfig = async (datosActualizados: any) => {
    if (!id) return;

    await updateDoc(
      doc(db, "pacientes", id),
      {
        activo: datosActualizados.activo,
        fechaFinAcceso:
          datosActualizados.fechaFinAcceso,
      },
    );

    const asignSnap = await getDocs(
      query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", id),
      ),
    );

    const actuales = asignSnap.docs.map((d) => ({
      id: d.id,
      testId: d.data().testId,
    }));

    const nuevos =
      datosActualizados.testsSeleccionados.filter(
        (test: string) =>
          !actuales.some(
            (asignacion) =>
              asignacion.testId === test,
          ),
      );

    const eliminados = actuales.filter(
      (asignacion) =>
        !datosActualizados.testsSeleccionados.includes(
          asignacion.testId,
        ),
    );

    await Promise.all(
      nuevos.map((testId: string) =>
        addDoc(
          collection(db, "asignaciones"),
          {
            pacienteId: id,
            testId,
            estado: "pendiente",
            fechaAsignacion: new Date(),
          },
        ),
      ),
    );

    await Promise.all(
      eliminados.map((asignacion) =>
        deleteDoc(
          doc(
            db,
            "asignaciones",
            asignacion.id,
          ),
        ),
      ),
    );

    const nuevoSnap = await getDocs(
      query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", id),
      ),
    );

    setAsignaciones(
      nuevoSnap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<
          Asignacion,
          "id"
        >),
      })) as Asignacion[],
    );

    setPatient((prev) =>
      prev
        ? {
            ...prev,
            activo: datosActualizados.activo,
            fechaFinAcceso:
              datosActualizados.fechaFinAcceso,
          }
        : prev,
    );
  };

  const handleEliminarPaciente = async () => {
    if (!id) return;

    setLoadingConfirm(true);

    try {
      await eliminarPaciente({
        pacienteId: id,
      });

      setConfirmData(null);
      navigate("/admin/pacientes");
    } catch (error) {
      console.error(
        "Error eliminando paciente:",
        error,
      );

      alert(mensajeErrorPaciente(error));
    } finally {
      setLoadingConfirm(false);
    }
  };

  const handleEliminarAsignacion = async (
    asignacion: Asignacion,
  ) => {
    if (!id) return;

    setLoadingConfirm(true);

    try {
      const resultadosDelTest = await getDocs(
        query(
          collection(db, "resultados"),
          where("pacienteId", "==", id),
          where("testId", "==", asignacion.testId),
        ),
      );

      await deleteDoc(
        doc(
          db,
          "asignaciones",
          asignacion.id,
        ),
      );

      await Promise.all(
        resultadosDelTest.docs.map((resultado) =>
          deleteDoc(
            doc(
              db,
              "resultados",
              resultado.id,
            ),
          ),
        ),
      );

      setAsignaciones((prev) =>
        prev.filter(
          (item) =>
            item.id !== asignacion.id,
        ),
      );

      setResultados((prev) =>
        prev.filter(
          (resultado) =>
            resultado.testId !==
            asignacion.testId,
        ),
      );
    } catch (error) {
      console.error(
        "Error eliminando asignación:",
        error,
      );

      alert(
        "No se pudo eliminar la asignación.",
      );
    } finally {
      setLoadingConfirm(false);
      setConfirmData(null);
    }
  };

  const handleEliminarResultado = async (
    resultado: Resultado,
  ) => {
    try {
      await deleteDoc(
        doc(
          db,
          "resultados",
          resultado.id,
        ),
      );

      setResultados((prev) =>
        prev.filter(
          (item) =>
            item.id !== resultado.id,
        ),
      );
    } catch (error) {
      console.error(
        "Error borrando resultado:",
        error,
      );

      alert(
        "No se pudo borrar el resultado.",
      );
    }
  };

  if (!patient) {
    return <h2>Cargando...</h2>;
  }

  return (
    <div className={styles.layout}>
        <div
          className={`card ${styles.cardPaciente}`}
        >
          <div>
          <h2>{patient.nombre}</h2>
          
          <aside className={styles.sidebar}>
            <p>
              <strong>DNI:</strong>{" "}
              {patient.dni}
            </p>

            <p>
              <strong>Estado:</strong>{" "}
              {getEstadoPaciente()}
            </p>

            <p>
              <strong>Acceso:</strong>{" "}
              {formatearFecha(
                patient.fechaInicioAcceso,
              )}{" "}
              →{" "}
              {formatearFecha(
                patient.fechaFinAcceso,
              )}
            </p>
          </aside>
</div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent:
                "space-between",
              alignItems: "center",
              gap: 8,
            }}
          >
            <BotonPersonalizado
              variant="secondary"
              onClick={() =>
                setDniModalOpen(true)
              }
              disabled={false}
            >
              DNI
            </BotonPersonalizado>

            <BotonPersonalizado
              variant="primary"
              onClick={() =>
                setIsConfigOpen(true)
              }
              tooltip="Cambiar la fecha de acceso y los tests asignados."
              disabled={false}
            >
              Modificar acceso
            </BotonPersonalizado>
          

          <BotonPersonalizado
            variant="danger"
            tooltip="Eliminar el perfil, su cuenta de acceso y sus evaluaciones."
            onClick={() =>
              abrirConfirm({
                titulo:
                  "Eliminar paciente",
                mensaje: `¿Eliminar a ${patient.nombre}?`,
                warning:
                  "Se eliminarán también sus asignaciones y evaluaciones.",
                onConfirm:
                  handleEliminarPaciente,
              })
            }
            disabled={loadingConfirm}
          >
            Borrar paciente
          </BotonPersonalizado>
        </div></div>

      <div className={styles.container}>
        <div
          className={styles.bloqueTabla}
        >
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

          <div className="scrollbar">
            <div className="tablaPacientes">
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
                  {asignaciones.map(
                    (asignacion) => (
                      <tr
                        key={
                          asignacion.id
                        }
                      >
                        <td>
                          {asignacion.testId?.toUpperCase()}
                        </td>

                        <td>
                          {
                            asignacion.estado
                          }
                        </td>

                        <td>
                          {formatearFecha(
                            asignacion.fechaAsignacion,
                          )}
                        </td>

                        <td>
                          {formatearFecha(
                            asignacion.fechaCompletado,
                          )}
                        </td>

                        <td>
                          <button
                            type="button"
                            aria-label="Eliminar asignación"
                            onClick={() =>
                              abrirConfirm(
                                {
                                  titulo:
                                    "Eliminar asignación",
                                  mensaje: `¿Eliminar ${asignacion.testId}?`,
                                  warning:
                                    "También se eliminarán los resultados asociados a este test.",
                                  onConfirm:
                                    () =>
                                      handleEliminarAsignacion(
                                        asignacion,
                                      ),
                                },
                              )
                            }
                          >
                            <img
                              src={
                                borrar
                              }
                              alt=""
                            />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div
          className={styles.bloqueTabla}
        >
          <div className={styles.nav}>
            <h3>Evaluaciones</h3>

            <BotonPersonalizado
              variant="secondary"
              onClick={descargarZip}
              tooltip="Descargar los informes PDF de todas las evaluaciones en un ZIP."
              disabled={false}
            >
              Descargar archivos
            </BotonPersonalizado>
          </div>

          <div className="scrollbar">
            <div className="tablaPacientes">
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
                  {tableData.map(
                    (resultado) => (
                      <tr
                        key={
                          resultado.id
                        }
                      >
                        <td>
                          {formatearFecha(
                            resultado.fecha,
                          )}
                        </td>

                        <td>
                          {
                            resultado.testId
                          }
                        </td>

                        <td>
                          <Tooltip
                            title="Agregar o editar observaciones"
                            arrow
                          >
                            <button
                              type="button"
                              aria-label="Editar observaciones"
                              onClick={() =>
                                handleOpenModal(
                                  resultado,
                                )
                              }
                            >
                              <img
                                src={
                                  editar
                                }
                                alt=""
                              />
                            </button>
                          </Tooltip>
                        </td>

                        <td>
                          <Tooltip
                            title="Descargar el informe de esta evaluación"
                            arrow
                          >
                            <button
                              type="button"
                              aria-label="Descargar PDF"
                              onClick={() =>
                                descargarIndividual(
                                  resultado,
                                )
                              }
                            >
                              <img
                                src={
                                  guardadoIcono
                                }
                                alt=""
                              />
                            </button>
                          </Tooltip>
                        </td>

                        <td>
                          <button
                            type="button"
                            aria-label="Eliminar resultado"
                            onClick={() =>
                              abrirConfirm(
                                {
                                  titulo:
                                    "Eliminar evaluación",
                                  mensaje:
                                    "¿Eliminar este resultado de evaluación?",
                                  warning:
                                    "Esta acción no se puede deshacer.",
                                  onConfirm:
                                    async () => {
                                      await handleEliminarResultado(
                                        resultado,
                                      );

                                      setConfirmData(
                                        null,
                                      );
                                    },
                                },
                              )
                            }
                          >
                            <img
                              src={
                                borrar
                              }
                              alt=""
                            />
                          </button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {isConfigOpen && (
        <EditarPacienteModal
          abierto={isConfigOpen}
          paciente={patient}
          asignacionesActuales={asignaciones.map(
            (a) => a.testId,
          )}
          onCerrar={() =>
            setIsConfigOpen(false)
          }
          onGuardar={
            handleGuardarConfig
          }
        />
      )}

      {confirmData && (
        <ConfirmModal
          abierto={true}
          onCerrar={() =>
            setConfirmData(null)
          }
          titulo={
            confirmData.titulo
          }
          mensaje={
            confirmData.mensaje
          }
          warning={
            confirmData.warning
          }
          onConfirm={
            confirmData.onConfirm
          }
          loading={
            loadingConfirm
          }
        />
      )}

      <ObservacionesModal
        abierto={isModalOpen}
        onCerrar={handleCloseModal}
        sesion={selectedResultado}
        onGuardarExitoso={
          handleSuccessfulSave
        }
      />

      {dniModalOpen && (
        <Modal
          abierto={dniModalOpen}
          onCerrar={() =>
            setDniModalOpen(false)
          }
          titulo="Estado del DNI"
        >
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent:
                "space-evenly",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <p>
                <strong>
                  DNI cargado:
                </strong>{" "}
                {patient.archivodni
                  ? "✔ Sí"
                  : "✖ No"}
              </p>

              {patient.archivodni && (
                <img
                  src={
                    patient.archivodni
                  }
                  alt="Foto DNI"
                  style={{
                    maxWidth: "12%",
                    marginTop: 8,
                  }}
                />
              )}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent:
                "space-between",
              gap: 8,
              marginTop: 16,
            }}
          >
            <BotonPersonalizado
              variant="primary"
              disabled={false}
              onClick={() => {
                setDniModalOpen(false);
                navigate("/app/tests");
              }}
            >
              Ir a Tests
            </BotonPersonalizado>

            <BotonPersonalizado
              variant="secondary"
              onClick={() =>
                setDniModalOpen(false)
              }
              disabled={false}
            >
              Cerrar
            </BotonPersonalizado>
          </div>
        </Modal>
      )}
    </div>
  );
}