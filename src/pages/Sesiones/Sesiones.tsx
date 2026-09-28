import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase.js";
import styles from "./Sesiones.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";
import ObservacionesModal from "../../components/Modal/ObservacionesModal";
import { collection, getDocs } from "firebase/firestore";
import { descargarInforme } from "../../utils/descargarInforme.ts";
import Modal from "../../components/Modal/Modal.tsx";
import NuevaSesion from "../NuevaSesion/NuevaSesion.tsx";

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
  id: string;
  nombre: string;
  archivodni?: string;
}

export default function Sesiones() {
  const [showModal, setShowModal] =
    useState(false);

  const [resultados, setResultados] =
    useState<Resultado[]>([]);

  const [pacientesMap, setPacientesMap] =
    useState<Record<string, Paciente>>({});

  const [loading, setLoading] =
    useState(true);

  const [isModalOpen, setIsModalOpen] =
    useState(false);

  const [
    selectedSession,
    setSelectedSession,
  ] = useState<Resultado | null>(null);

  const formatearFecha = (
    timestamp: any,
  ): string => {
    if (!timestamp) return "N/A";

    if (
      typeof timestamp.toDate ===
      "function"
    ) {
      return timestamp
        .toDate()
        .toLocaleDateString("es-AR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });
    }

    if (
      typeof timestamp.seconds ===
      "number"
    ) {
      return new Date(
        timestamp.seconds * 1000,
      ).toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return "N/A";
  };

  const handleOpenModal = (
    resultado: Resultado,
  ) => {
    setSelectedSession(resultado);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSession(null);
  };

  const handleSuccessfulSave = (
    id: string,
    nuevasObservaciones: string,
  ) => {
    setResultados((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              observacionesIniciales:
                nuevasObservaciones,
            }
          : r,
      ),
    );
  };

  const guardarNuevaSesion = () => {
    setShowModal(true);
  };

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setLoading(true);

        const snapResultados =
          await getDocs(
            collection(
              db,
              "resultados",
            ),
          );

        const resultadosData =
          snapResultados.docs.map(
            (d) => ({
              id: d.id,
              ...d.data(),
            }),
          ) as Resultado[];

        const snapPacientes =
          await getDocs(
            collection(
              db,
              "pacientes",
            ),
          );

        const map: Record<
          string,
          Paciente
        > = {};

        snapPacientes.docs.forEach(
          (d) => {
            const data = d.data();

            map[d.id] = {
              id: d.id,
              nombre:
                data.nombre ||
                "Sin nombre",
              archivodni:
                data.archivodni ||
                data.archivoDNI,
            };
          },
        );

        setResultados(
          resultadosData,
        );

        setPacientesMap(map);
      } catch (error) {
        console.error(
          "Error al cargar sesiones:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

    void cargarDatos();
  }, []);

  const totalTests =
    resultados.length;

  const pacientesEvaluados =
    new Set(
      resultados
        .map((r) => r.pacienteId)
        .filter(Boolean),
    ).size;

  const ultimaFecha =
    resultados
      .map((r) => r.fecha)
      .filter(Boolean)
      .sort(
        (a, b) =>
          (b.seconds || 0) -
          (a.seconds || 0),
      )[0] || null;

  if (loading) {
    return (
      <div className={styles.loading}>
        <div
          className={
            styles.loadingIndicator
          }
        />

        <p>Cargando sesiones...</p>
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
              EVALUACIONES
            </span>

            <h1>Sesiones</h1>

            <p>
              Consultá los resultados,
              observaciones e informes de
              las evaluaciones realizadas.
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
                guardarNuevaSesion
              }
              tooltip="Registrar una nueva sesión."
              disabled={false}
            >
              + Nueva sesión
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
                Tests realizados
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
              {totalTests}
            </strong>

            <p>
              Evaluaciones completadas
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
                Pacientes evaluados
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
              {pacientesEvaluados}
            </strong>

            <p>
              Pacientes con resultados
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
                Último test
              </span>

              <span
                className={
                  styles.metricaDot
                }
              />
            </div>

            <strong
              className={`${styles.metricaNumero} ${styles.metricaFecha}`}
            >
              {ultimaFecha
                ? formatearFecha(
                    ultimaFecha,
                  )
                : "—"}
            </strong>

            <p>
              Última evaluación
              registrada
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
                Resultados de
                evaluaciones
              </h2>

              <p>
                {totalTests === 1
                  ? "1 evaluación registrada"
                  : `${totalTests} evaluaciones registradas`}
              </p>
            </div>
          </div>

          <div
            className={
              styles.tablaSesiones
            }
          >
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>

                  <th>Test</th>

                  <th>Paciente</th>

                  <th>
                    Observaciones
                  </th>

                  <th
                    className={
                      styles.accionHeader
                    }
                  >
                    Informe
                  </th>
                </tr>
              </thead>

              <tbody>
                {resultados.length ===
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
                        resultados
                      </strong>

                      <span>
                        Las evaluaciones
                        completadas
                        aparecerán acá.
                      </span>
                    </td>
                  </tr>
                ) : (
                  resultados.map(
                    (r) => {
                      const paciente =
                        pacientesMap[
                          r.pacienteId ||
                            ""
                        ];

                      const tieneObservaciones =
                        Boolean(
                          r.observacionesIniciales?.trim(),
                        );

                      return (
                        <tr key={r.id}>
                          {/* FECHA */}

                          <td>
                            <span
                              className={
                                styles.fecha
                              }
                            >
                              {formatearFecha(
                                r.fecha,
                              )}
                            </span>
                          </td>

                          {/* TEST */}

                          <td>
                            <span
                              className={
                                styles.testBadge
                              }
                            >
                              {r.testId?.toUpperCase() ||
                                "—"}
                            </span>
                          </td>

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
                                {paciente?.nombre
                                  ? paciente.nombre
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
                                      .toUpperCase()
                                  : "?"}
                              </div>

                              <div
                                className={
                                  styles.pacienteInfo
                                }
                              >
                                <strong>
                                  {paciente?.nombre ||
                                    "Paciente no encontrado"}
                                </strong>

                                <span>
                                  Paciente
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* OBSERVACIONES */}

                          <td>
                            <button
                              type="button"
                              className={`${styles.observacionButton} ${
                                tieneObservaciones
                                  ? styles.observacionGuardada
                                  : ""
                              }`}
                              onClick={() =>
                                handleOpenModal(
                                  r,
                                )
                              }
                            >
                              <span
                                className={
                                  styles.actionIcon
                                }
                              >
                                {tieneObservaciones
                                  ? "✓"
                                  : "+"}
                              </span>

                              <span>
                                {tieneObservaciones
                                  ? "Ver / editar"
                                  : "Agregar"}
                              </span>
                            </button>
                          </td>

                          {/* INFORME */}

                          <td
                            className={
                              styles.accionCell
                            }
                          >
                            <button
                              type="button"
                              className={
                                styles.downloadButton
                              }
                              onClick={() =>
                                descargarInforme(
                                  r,
                                  paciente,
                                )
                              }
                            >
                              <span>
                                Descargar
                              </span>

                              <span
                                className={
                                  styles.downloadIcon
                                }
                                aria-hidden="true"
                              >
                                ↓
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
          OBSERVACIONES
      ========================= */}

      <ObservacionesModal
        abierto={isModalOpen}
        onCerrar={handleCloseModal}
        sesion={selectedSession}
        onGuardarExitoso={
          handleSuccessfulSave
        }
      />

      {/* =========================
          NUEVA SESIÓN
      ========================= */}

      {showModal && (
        <Modal
          abierto={true}
          onCerrar={() =>
            setShowModal(false)
          }
          titulo="Registrar nueva sesión"
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
              <NuevaSesion
                onClose={() =>
                  setShowModal(
                    false,
                  )
                }
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}