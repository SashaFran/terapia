import { logoutPatient } from "../../../utils/patientAccess";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";


import {
  db,
} from "../../../firebase/firebase";

import styles from "./TestsPaciente.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";
import LoadingState from "../../../components/Loading/LoadingState";

interface Test {
  id: string;
  testId?: string;
  estado: string;
}

const NOMBRES_TESTS: Record<string, string> = {
  k10: "Escala de Malestar Psicológico K10",
  bfq: "Cuestionario Big Five",
  zulliger: "Test de Zulliger",
  bender: "Test Gestáltico Visomotor de Bender",
  raven: "Matrices Progresivas de Raven",
};

const DESCRIPCIONES_TESTS: Record<string, string> = {
  k10: "Cuestionario de evaluación psicológica.",
  bfq: "Evaluación de características de personalidad.",
  zulliger: "Evaluación mediante láminas e interpretación de respuestas.",
  bender: "Evaluación de integración visomotora.",
  raven: "Evaluación de razonamiento y capacidad de resolución.",
};

export default function TestsPaciente() {
  const navigate = useNavigate();

  const [paciente, setPaciente] =
    useState<any>(null);

  const [tests, setTests] =
    useState<Test[]>([]);

  const [loading, setLoading] =
    useState(true);

  const calcularProgreso = (
    listaTests: Test[],
  ) => {
    const total = listaTests.length;

    const realizados =
      listaTests.filter(
        (test) =>
          test.estado === "completado",
      ).length;

    const porcentaje =
      total > 0
        ? Math.round(
            (realizados / total) * 100,
          )
        : 0;

    return {
      realizados,
      total,
      porcentaje,
    };
  };

  const {
    realizados,
    total,
    porcentaje,
  } = calcularProgreso(tests);

  const dniCargado =
    !!paciente?.archivodni;

  const convertirFecha = (
    fecha: any,
  ): Date | null => {
    if (!fecha) return null;

    if (
      typeof fecha.toDate === "function"
    ) {
      return fecha.toDate();
    }

    if (
      typeof fecha.seconds === "number"
    ) {
      return new Date(
        fecha.seconds * 1000,
      );
    }

    const date = new Date(fecha);

    return Number.isNaN(
      date.getTime(),
    )
      ? null
      : date;
  };

  const formatearFecha = (
    fecha: any,
  ) => {
    const date = convertirFecha(fecha);

    if (!date) return "—";

    return date.toLocaleDateString(
      "es-AR",
      {
        day: "2-digit",
        month: "short",
        year: "numeric",
      },
    );
  };

  const formatearHora = (
    fecha: any,
  ) => {
    const date = convertirFecha(fecha);

    if (!date) return "";

    return date.toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );
  };

  const obtenerNombreTest = (
    testId?: string,
  ) => {
    if (!testId) {
      return "Evaluación";
    }

    return (
      NOMBRES_TESTS[testId] ||
      testId.toUpperCase()
    );
  };

  const obtenerDescripcionTest = (
    testId?: string,
  ) => {
    if (!testId) {
      return "Evaluación psicológica asignada.";
    }

    return (
      DESCRIPCIONES_TESTS[testId] ||
      "Evaluación psicológica asignada."
    );
  };

  const obtenerEstado = (
    estado: string,
  ) => {
    switch (estado) {
      case "completado":
        return {
          texto: "Completado",
          clase: styles.completed,
        };

      case "abandono":
        return {
          texto: "Abandonado",
          clase: styles.abandoned,
        };

      case "en_curso":
        return { texto: "En curso", clase: styles.pending };
      default:
        return {
          texto: "Pendiente",
          clase: styles.pending,
        };
    }
  };

  useEffect(() => {
    const data = localStorage.getItem("paciente");
    if (!data) { navigate("/login"); return; }
    let patient;
    try { patient = JSON.parse(data); } catch { navigate("/login"); return; }
    setPaciente(patient);
    const assignments = query(collection(db, "asignaciones"), where("pacienteId", "==", patient.id));
    return onSnapshot(assignments, snap => {
      setTests(snap.docs.map(documento => ({ id: documento.id, ...documento.data() })) as Test[]);
      setLoading(false);
    }, error => { console.error("Error cargando evaluaciones:", error); setLoading(false); });
  }, [navigate]);

  const cerrarSesion = async () => {
    if (!window.confirm("Al cerrar sesión su cuenta quedará inhabilitada y no podrá volver a ingresar. ¿Desea continuar?")) return;
    try { await logoutPatient(); } finally { navigate("/login", { replace: true }); }
  };

  if (loading) {
    return <LoadingState message="Cargando tus evaluaciones..." />;
  }

  return (
    <div className={styles.container}>
      {/* ENCABEZADO */}
      <header
        className={styles.header}
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            EVALUACIONES
          </span>

          <h1>
            Mis evaluaciones
          </h1>

          <p>
            Completá las evaluaciones
            asignadas dentro del período
            habilitado.
          </p>
        </div>

        <div
          className={
            styles.deadline
          }
        >
          <span>
            Acceso disponible hasta
          </span>

          <strong>
            {formatearFecha(
              paciente?.fechaFinAcceso,
            )}
          </strong>

          <small>
            {formatearHora(
              paciente?.fechaFinAcceso,
            )}{" "}
            hs
          </small>
        </div>
      </header>

      {/* PROGRESO */}
      <section
        className={
          styles.progressCard
        }
      >
        <div
          className={
            styles.progressTop
          }
        >
          <div>
            <span>
              Tu progreso
            </span>

            <strong>
              {realizados} de{" "}
              {total} completadas
            </strong>
          </div>

          <span
            className={
              styles.percentage
            }
          >
            {porcentaje}%
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
      </section>

      {/* DNI PENDIENTE */}
      {!dniCargado &&
        realizados < total && (
          <section
            className={
              styles.identityNotice
            }
          >
            <div>
              <span
                className={
                  styles.noticeLabel
                }
              >
                PASO PREVIO
              </span>

              <h2>
                Validá tu identidad
              </h2>

              <p>
                Antes de comenzar las
                evaluaciones necesitamos
                que cargues una imagen de
                tu DNI.
              </p>
            </div>

            <BotonPersonalizado
              variant="primary"
              onClick={() =>
                navigate("/app/dni")
              }
              disabled={false}
            >
              Subir DNI
            </BotonPersonalizado>
          </section>
        )}

      {/* LISTA */}
      <section
        className={
          styles.evaluations
        }
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <h2>
              Evaluaciones asignadas
            </h2>

            <p>
              Seleccioná una evaluación
              para ver sus instrucciones
              y comenzar.
            </p>
          </div>

          <span
            className={
              styles.testCount
            }
          >
            {total}{" "}
            {total === 1
              ? "evaluación"
              : "evaluaciones"}
          </span>
        </div>

        <div
          className={
            styles.testList
          }
        >
          {tests.map(
            (test, index) => {
              const estado =
                obtenerEstado(
                  test.estado,
                );

              const bloqueado =
                !dniCargado &&
                test.estado !==
                  "completado";

              return (
                <article
                  key={test.id}
                  className={`${styles.testCard} ${
                    bloqueado
                      ? styles.locked
                      : ""
                  }`}
                >
                  <div
                    className={
                      styles.testNumber
                    }
                  >
                    {String(
                      index + 1,
                    ).padStart(
                      2,
                      "0",
                    )}
                  </div>

                  <div
                    className={
                      styles.testContent
                    }
                  >
                    <div
                      className={
                        styles.testTitle
                      }
                    >
                      <h3>
                        {obtenerNombreTest(
                          test.testId,
                        )}
                      </h3>

                      <span
                        className={`${styles.status} ${estado.clase}`}
                      >
                        {
                          estado.texto
                        }
                      </span>
                    </div>

                    <p>
                      {obtenerDescripcionTest(
                        test.testId,
                      )}
                    </p>
                  </div>

                  <div
                    className={
                      styles.testAction
                    }
                  >
                    {test.estado ===
                    "completado" ? (
                      <span
                        className={
                          styles.doneText
                        }
                      >
                        Finalizado
                      </span>
                    ) : test.estado ===
                      "abandono" ? (
                      <span
                        className={
                          styles.blockedText
                        }
                      >
                        No disponible
                      </span>
                    ) : test.estado === "en_curso" ? (
                      <span className={styles.blockedText}>Registrando salida…</span>
                    ) : bloqueado ? (
                      <span
                        className={
                          styles.lockedText
                        }
                      >
                        Requiere DNI
                      </span>
                    ) : (
                      <BotonPersonalizado
                        variant="primary"
                        tooltip="Ver las instrucciones e iniciar esta evaluación."
                        onClick={() =>
                          navigate(
                            `/app/test/${test.testId}`,
                          )
                        }
                        disabled={
                          false
                        }
                      >
                        Comenzar
                      </BotonPersonalizado>
                    )}
                  </div>
                </article>
              );
            },
          )}
        </div>
      </section>

      {/* TODO COMPLETADO */}
      {total > 0 &&
        realizados === total && (
          <section
            className={
              styles.completedCard
            }
          >
            <div>
              <span
                className={
                  styles.completedLabel
                }
              >
                PROCESO COMPLETADO
              </span>

              <h2>
                Finalizaste todas tus
                evaluaciones
              </h2>

              <p>
                Tus respuestas fueron
                registradas correctamente.
                Ya podés cerrar tu sesión.
              </p>
            </div>

            <BotonPersonalizado
              variant="secondary"
              onClick={
                cerrarSesion
              }
              disabled={false}
            >
              Cerrar sesión
            </BotonPersonalizado>
          </section>
        )}
    </div>
  );
}