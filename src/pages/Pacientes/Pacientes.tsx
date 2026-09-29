import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase.jsx";
import styles from "./Pacientes.module.css";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { obtenerMetricasPacientes } from "../../utils/obtencion/obtenerMetricasPacientes.tsx";
import NuevoPaciente from "../NuevoPaciente/NuevoPaciente.tsx";
import Modal from "../../components/Modal/Modal.tsx";

type EstadoPaciente =
  | "Pendiente"
  | "Activo"
  | "Vencido"
  | "Inactivo";

interface Paciente {
  id: string;
  nombre: string;
  estado: EstadoPaciente;
  fechaIngreso: string;
  testsAsignados: number;
  testsFinalizados: number;
}

function convertirFecha(fecha: any): Date | null {
  if (!fecha) return null;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const date = new Date(fecha);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

export default function Dashboard() {
  const [showModal, setShowModal] =
    useState(false);

  const navigate = useNavigate();

  const [pacientes, setPacientes] =
    useState<Paciente[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [metricas, setMetricas] =
    useState({
      total: 0,
      nuevosSemana: 0,
      nuevosMes: 0,
    });

  const guardarNuevoPaciente = () => {
    setShowModal(true);
  };

  const formatearFecha = (
    timestamp: any,
  ): string => {
    const fecha =
      convertirFecha(timestamp);

    if (!fecha) return "N/A";

    return fecha.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      },
    );
  };

  const obtenerEstadoPaciente = (
    docData: any,
  ): EstadoPaciente => {
    const ahora = new Date();

    const inicio = convertirFecha(
      docData.fechaInicioAcceso,
    );

    const fin = convertirFecha(
      docData.fechaFinAcceso,
    );

    /*
     * Todavía no comenzó la ventana
     * de acceso.
     */
    if (inicio && ahora < inicio) {
      return "Pendiente";
    }

    /*
     * La ventana de acceso ya terminó.
     */
    if (fin && ahora >= fin) {
      return "Vencido";
    }

    /*
     * Fue desactivado manualmente.
     */
    if (docData.activo === false) {
      return "Inactivo";
    }

    return "Activo";
  };

  const cargarPacientes = async () => {
    try {
      setLoading(true);

      const querySnapshot =
        await getDocs(
          collection(db, "pacientes"),
        );

      const data: Paciente[] =
        await Promise.all(
          querySnapshot.docs.map(
            async (docPaciente) => {
              const docData =
                docPaciente.data();

              const q = query(
                collection(
                  db,
                  "asignaciones",
                ),
                where(
                  "pacienteId",
                  "==",
                  docPaciente.id,
                ),
              );

              const asignacionesSnap =
                await getDocs(q);

              const testsAsignados =
                asignacionesSnap.size;

              const testsFinalizados =
                asignacionesSnap.docs.filter(
                  (docAsignacion) =>
                    docAsignacion.data()
                      .estado ===
                    "completado",
                ).length;

              const estado =
                obtenerEstadoPaciente(
                  docData,
                );

              return {
                id: docPaciente.id,

                nombre:
                  docData.nombre ||
                  "Sin nombre",

                estado,

                fechaIngreso:
                  formatearFecha(
                    docData.createdAt,
                  ),

                testsAsignados,

                testsFinalizados,
              };
            },
          ),
        );

      setPacientes(data);
    } catch (error) {
      console.error(
        "Error al cargar pacientes:",
        error,
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarPacientes();
  }, []);

  useEffect(() => {
    obtenerMetricasPacientes()
      .then(setMetricas)
      .catch((error) => {
        console.error(
          "Error al obtener métricas:",
          error,
        );
      });
  }, []);

  const getEstadoClass = (
    estado: EstadoPaciente,
  ) => {
    switch (estado) {
      case "Activo":
        return styles.estadoActivo;

      case "Pendiente":
        return styles.estadoPendiente;

      case "Vencido":
        return styles.estadoVencido;

      case "Inactivo":
        return styles.estadoInactivo;

      default:
        return "";
    }
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div
          className={
            styles.loadingIndicator
          }
        />

        <p>Cargando pacientes...</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        {/* =========================
            ENCABEZADO
        ========================= */}

        <section
          className={styles.pageHeader}
        >
          <div>
            <span
              className={
                styles.eyebrow
              }
            >
              GESTIÓN
            </span>

            <h1>Pacientes</h1>

            <p>
              Administrá pacientes,
              accesos y evaluaciones
              asignadas.
            </p>
          </div>

          <div
            className={
              styles.headerAction
            }
          >
            <BotonPersonalizado
              variant="primary"
              onClick={
                guardarNuevoPaciente
              }
              tooltip="Registrar un paciente y asignarle sus tests en el mismo paso."
              disabled={false}
            >
              + Nuevo paciente
            </BotonPersonalizado>
          </div>
        </section>

        {/* =========================
            MÉTRICAS
        ========================= */}

        <section
          className={
            styles.metricasGrid
          }
        >
          <article
            className={
              styles.metricaCard
            }
          >
            <div
              className={
                styles.metricaTop
              }
            >
              <span>
                Total de pacientes
              </span>

              <span
                className={
                  styles.metricaDot
                }
              />
            </div>

            <strong
              className={
                styles.metricaNumero
              }
            >
              {metricas.total}
            </strong>

            <p>
              Pacientes registrados
            </p>
          </article>

          <article
            className={
              styles.metricaCard
            }
          >
            <div
              className={
                styles.metricaTop
              }
            >
              <span>
                Esta semana
              </span>

              <span
                className={
                  styles.metricaDot
                }
              />
            </div>

            <strong
              className={
                styles.metricaNumero
              }
            >
              {metricas.nuevosSemana}
            </strong>

            <p>
              Nuevos pacientes
            </p>
          </article>

          <article
            className={
              styles.metricaCard
            }
          >
            <div
              className={
                styles.metricaTop
              }
            >
              <span>
                Este mes
              </span>

              <span
                className={
                  styles.metricaDot
                }
              />
            </div>

            <strong
              className={
                styles.metricaNumero
              }
            >
              {metricas.nuevosMes}
            </strong>

            <p>
              Nuevos pacientes
            </p>
          </article>
        </section>

        {/* =========================
            TABLA
        ========================= */}

        <main
          className={
            styles.tableSection
          }
        >
          <div
            className={
              styles.tableHeader
            }
          >
            <div>
              <h2>
                Pacientes registrados
              </h2>

              <p>
                {pacientes.length === 1
                  ? "1 paciente en el sistema"
                  : `${pacientes.length} pacientes en el sistema`}
              </p>
            </div>
          </div>

          <div
            className={
              styles.tablaPacientes
            }
          >
            <table>
              <thead>
                <tr>
                  <th>Paciente</th>

                  <th>Estado</th>

                  <th>
                    Fecha de ingreso
                  </th>

                  <th>
                    Evaluaciones
                  </th>

                  <th
                    className={
                      styles.accionHeader
                    }
                  >
                    Acción
                  </th>
                </tr>
              </thead>

              <tbody>
                {pacientes.length ===
                0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className={
                        styles.emptyState
                      }
                    >
                      <strong>
                        Todavía no hay
                        pacientes
                      </strong>

                      <span>
                        Los pacientes
                        registrados
                        aparecerán acá.
                      </span>
                    </td>
                  </tr>
                ) : (
                  pacientes.map(
                    (paciente) => {
                      const porcentaje =
                        paciente.testsAsignados >
                        0
                          ? Math.round(
                              (paciente.testsFinalizados /
                                paciente.testsAsignados) *
                                100,
                            )
                          : 0;

                      return (
                        <tr
                          key={
                            paciente.id
                          }
                        >
                          {/* PACIENTE */}

                          <td>
                            <div
                              className={
                                styles.pacienteCell
                              }
                            >
                              <div
                                className={
                                  styles.pacienteAvatar
                                }
                              >
                                {paciente.nombre
                                  .trim()
                                  .split(
                                    /\s+/,
                                  )
                                  .slice(
                                    0,
                                    2,
                                  )
                                  .map(
                                    (
                                      parte,
                                    ) =>
                                      parte.charAt(
                                        0,
                                      ),
                                  )
                                  .join(
                                    "",
                                  )
                                  .toUpperCase()}
                              </div>

                              <div
                                className={
                                  styles.pacienteInfo
                                }
                              >
                                <strong>
                                  {
                                    paciente.nombre
                                  }
                                </strong>
                              </div>
                            </div>
                          </td>

                          {/* ESTADO */}

                          <td>
                            <span
                              className={`${styles.estadoBadge} ${getEstadoClass(
                                paciente.estado,
                              )}`}
                            >
                              <span
                                className={
                                  styles.estadoDot
                                }
                              />

                              {
                                paciente.estado
                              }
                            </span>
                          </td>

                          {/* FECHA */}

                          <td>
                            <span
                              className={
                                styles.fecha
                              }
                            >
                              {
                                paciente.fechaIngreso
                              }
                            </span>
                          </td>

                          {/* TESTS */}

                          <td>
                            <div
                              className={
                                styles.testsCell
                              }
                            >
                              <div
                                className={
                                  styles.testsText
                                }
                              >
                                <strong>
                                  {
                                    paciente.testsFinalizados
                                  }
                                </strong>

                                <span>
                                  {" "}
                                  de{" "}
                                  {
                                    paciente.testsAsignados
                                  }{" "}
                                  completados
                                </span>
                              </div>

                              <div
                                className={
                                  styles.progressTrack
                                }
                              >
                                <div
                                  className={
                                    styles.progressBar
                                  }
                                  style={{
                                    width: `${porcentaje}%`,
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* ACCIÓN */}

                          <td
                            className={
                              styles.accionCell
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.verButton
                              }
                              onClick={() =>
                                navigate(
                                  `/admin/paciente/${paciente.id}`,
                                )
                              }
                            >
                              Ver detalle

                              <span
                                aria-hidden="true"
                              >
                                →
                              </span>
                            </button>
                          </td>
                        </tr>
                      );
                    },
                  )
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* =========================
          MODAL
      ========================= */}

      {showModal && (
        <Modal
          abierto={true}
          onCerrar={() =>
            setShowModal(false)
          }
          titulo="Registrar nuevo paciente"
        >
          <div
            className={
              styles.modalOverlay
            }
          >
            <div
              className={
                styles.modalContent
              }
            >
              <NuevoPaciente
                onClose={() =>
                  setShowModal(
                    false,
                  )
                }
                onPacienteCreado={
                  cargarPacientes
                }
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}