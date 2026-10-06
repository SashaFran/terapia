import { useEffect, useState } from "react";

import styles from "./Dashboard.module.css";
import LoadingState from "../../components/Loading/LoadingState";

import { db } from "../../firebase/firebase";

import {
  collection,
  getDocs,
  query,
  orderBy,
  limit,
  type Timestamp,
} from "firebase/firestore";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

/* =========================================================
   TIPOS
========================================================= */

type Activity = {
  titulo: string;
  subtitulo: string;
  tiempo: string;
};

type TestLevel = {
  label: string;
  valor: number;
  color: string;
};

type ChartPoint = {
  name: string;
  p: number;
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function Dashboard() {
  const [totalPacientes, setTotalPacientes] =
    useState(0);

  const [
    totalEvaluaciones,
    setTotalEvaluaciones,
  ] = useState(0);

  const [
    testMasUsado,
    setTestMasUsado,
  ] = useState("Sin datos");

  const [actividades, setActividades] =
    useState<Activity[]>([]);

  const [dataNiveles, setDataNiveles] =
    useState<TestLevel[]>([]);

  const [dataGrafico, setDataGrafico] =
    useState<ChartPoint[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     TIEMPO RELATIVO
  ======================================================= */

  const calcularTiempoRelativo = (
    timestamp: Timestamp | undefined,
  ) => {
    if (!timestamp?.toDate) {
      return "Reciente";
    }

    const fecha = timestamp.toDate();

    const diff =
      (Date.now() -
        fecha.getTime()) /
      1000;

    if (diff < 60) {
      return "Hace segundos";
    }

    if (diff < 3600) {
      return `Hace ${Math.floor(
        diff / 60,
      )} min`;
    }

    if (diff < 86400) {
      return `Hace ${Math.floor(
        diff / 3600,
      )} hs`;
    }

    return fecha.toLocaleDateString(
      "es-AR",
    );
  };

  /* =======================================================
     CARGA DE DATOS
  ======================================================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        /* -------------------------
           PACIENTES Y RESULTADOS
        ------------------------- */

        const pacientesSnap =
          await getDocs(
            collection(
              db,
              "pacientes",
            ),
          );

        const resultadosSnap =
          await getDocs(
            collection(
              db,
              "resultados",
            ),
          );

        const resultados =
          resultadosSnap.docs.map(
            (documento) =>
              documento.data(),
          );

        setTotalPacientes(
          pacientesSnap.size,
        );

        setTotalEvaluaciones(
          resultados.length,
        );

        /* -------------------------
           RESOLVER NOMBRE PACIENTE
        ------------------------- */

        const convertir = (
          pacienteId:
            | string
            | undefined,
        ):
          | string
          | undefined => {
          const paciente =
            pacientesSnap.docs.find(
              (documento) =>
                documento.id ===
                pacienteId,
            );

          return paciente
            ?.data()
            .nombre;
        };

        /* -------------------------
           DISTRIBUCIÓN DE TESTS
        ------------------------- */

        const conteo: Record<
          string,
          number
        > = {};

        resultados.forEach(
          (resultado) => {
            const test =
              resultado.testId ||
              "Sin nombre";

            conteo[test] =
              (conteo[test] || 0) +
              1;
          },
        );

        const total =
          resultados.length || 1;

        const niveles =
          Object.keys(conteo)
            .map((test, i) => ({
              label: test,

              valor: Math.round(
                (conteo[test] /
                  total) *
                  100,
              ),

              color: [
                "var(--rojo)",
                "var(--naranja)",
                "var(--opuesto)",
                "var(--bordo)",
                "var(--marron)",
              ][i % 5],
            }))
            .sort(
              (a, b) =>
                b.valor - a.valor,
            );

        setDataNiveles(
          niveles.slice(0, 5),
        );

        if (niveles.length) {
          setTestMasUsado(
            niveles[0].label,
          );
        } else {
          setTestMasUsado(
            "Sin datos",
          );
        }

        /* -------------------------
           EVOLUCIÓN POR MES
        ------------------------- */

        const meses: Record<
          string,
          number
        > = {};

        resultados.forEach(
          (resultado) => {
            if (
              !resultado.fecha?.toDate
            ) {
              return;
            }

            const fecha =
              resultado.fecha.toDate();

            const key =
              `${fecha.getFullYear()}-${fecha.getMonth()}`;

            meses[key] =
              (meses[key] || 0) + 1;
          },
        );

        const mesesOrdenados =
          Object.keys(meses)
            .sort()
            .slice(-6);

        const dataGraf =
          mesesOrdenados.map(
            (key) => {
              const [year, month] =
                key.split("-");

              const fecha =
                new Date(
                  Number(year),
                  Number(month),
                );

              return {
                name: fecha.toLocaleString(
                  "es-AR",
                  {
                    month: "short",
                  },
                ),

                p: meses[key],
              };
            },
          );

        setDataGrafico(dataGraf);

        /* -------------------------
           ACTIVIDAD RECIENTE
        ------------------------- */

        const actividadQuery =
          query(
            collection(
              db,
              "resultados",
            ),

            orderBy(
              "fecha",
              "desc",
            ),

            limit(6),
          );

        const actividadSnap =
          await getDocs(
            actividadQuery,
          );

        setActividades(
          actividadSnap.docs.map(
            (documento) => {
              const data =
                documento.data();

              return {
                titulo:
                  `Evaluación ${
                    data.testId ||
                    "—"
                  }`,

                subtitulo:
                  convertir(
                    data.pacienteId,
                  ) ||
                  "Paciente",

                tiempo:
                  calcularTiempoRelativo(
                    data.fecha,
                  ),
              };
            },
          ),
        );
      } catch (err) {
        console.error(
          "Error dashboard:",
          err,
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <LoadingState message="Cargando panel..." />;
  }

  /* =======================================================
     FECHA
  ======================================================= */

  const fechaActual = new Date();

  const fechaResumen =
    fechaActual.toLocaleDateString(
      "es-AR",
      {
        weekday: "long",
        day: "numeric",
        month: "long",
      },
    );

  const horaResumen =
    fechaActual.toLocaleTimeString(
      "es-AR",
      {
        hour: "2-digit",
        minute: "2-digit",
      },
    );

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className={styles.dashboard}
      aria-label="Panel de control"
    >
      {/* ===============================================
          RESUMEN
      =============================================== */}

      <article
        className={`${styles.card} ${styles.summary}`}
      >
        <div
          className={
            styles.summaryContent
          }
        >
          <p
            className={
              styles.eyebrow
            }
          >
            Resumen del día
          </p>

          <h1>
            Tu actividad clínica,
            en un vistazo.
          </h1>

          <p
            className={
              styles.summaryDate
            }
          >
            <span>
              {fechaResumen}
            </span>

            <span
              className={
                styles.dateSeparator
              }
              aria-hidden="true"
            >
              ·
            </span>

            <span>
              {horaResumen}
            </span>
          </p>
        </div>

        <div
          className={
            styles.summaryVisual
          }
          aria-hidden="true"
        >
          <span
            className={
              styles.summaryRingOuter
            }
          />

          <span
            className={
              styles.summaryRingMiddle
            }
          />

          <span
            className={
              styles.summaryRingInner
            }
          />
        </div>
      </article>

      {/* ===============================================
          KPIS
      =============================================== */}

      <article
        className={`${styles.card} ${styles.kpis}`}
      >
        <div
          className={
            styles.kpiHeader
          }
        >
          <p
            className={
              styles.eyebrow
            }
          >
            Indicadores principales
          </p>

          <span
            className={
              styles.kpiHeaderHint
            }
          >
            Estado general
          </span>
        </div>

        <div
          className={
            styles.kpiGrid
          }
        >
          <div
            className={
              styles.kpi
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              <span
                className={
                  styles.kpiLabel
                }
              >
                Pacientes
              </span>

              <span
                className={
                  styles.kpiDot
                }
              />
            </div>

            <strong>
              {totalPacientes}
            </strong>

            <span
              className={
                styles.kpiDescription
              }
            >
              Registrados
            </span>
          </div>

          <div
            className={
              styles.kpi
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              <span
                className={
                  styles.kpiLabel
                }
              >
                Test más utilizado
              </span>

              <span
                className={
                  styles.kpiDot
                }
              />
            </div>

            <strong
              className={
                styles.kpiTest
              }
              title={
                testMasUsado
              }
            >
              {testMasUsado}
            </strong>

            <span
              className={
                styles.kpiDescription
              }
            >
              Mayor frecuencia
            </span>
          </div>

          <div
            className={
              styles.kpi
            }
          >
            <div
              className={
                styles.kpiTop
              }
            >
              <span
                className={
                  styles.kpiLabel
                }
              >
                Evaluaciones
              </span>

              <span
                className={
                  styles.kpiDot
                }
              />
            </div>

            <strong>
              {totalEvaluaciones}
            </strong>

            <span
              className={
                styles.kpiDescription
              }
            >
              Realizadas
            </span>
          </div>
        </div>
      </article>

      {/* ===============================================
          EVOLUCIÓN
      =============================================== */}

      <article
        className={`${styles.card} ${styles.trend}`}
      >
        <div
          className={
            styles.cardHeading
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Seguimiento
            </p>

            <h2>
              Evolución clínica
            </h2>
          </div>

          <span
            className={
              styles.chartCaption
            }
          >
            Evaluaciones por mes
          </span>
        </div>

        {dataGrafico.length ? (
          <div
            className={
              styles.chart
            }
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <AreaChart
                data={
                  dataGrafico
                }
                margin={{
                  top: 18,
                  right: 12,
                  left: -18,
                  bottom: 0,
                }}
              >
                <defs>
                  <linearGradient
                    id="dashboardTrendFill"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="0%"
                      stopColor="var(--opuesto-light)"
                      stopOpacity={
                        0.2
                      }
                    />

                    <stop
                      offset="100%"
                      stopColor="var(--opuesto-light)"
                      stopOpacity={
                        0.01
                      }
                    />
                  </linearGradient>
                </defs>

                <CartesianGrid
                  vertical={false}
                  stroke="var(--gris)"
                  strokeDasharray="3 5"
                />

                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--gris-med)",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  allowDecimals={
                    false
                  }
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--gris-med)",
                    fontSize: 11,
                  }}
                  width={32}
                />

                <Tooltip
                  cursor={{
                    stroke:
                      "rgba(255, 136, 0, 0.12)",
                  }}
                  contentStyle={{
                    background:
                      "#ffffff",

                    border:
                      "1px solid #e8eaed",

                    borderRadius:
                      "10px",

                    boxShadow:
                      "0 8px 24px rgba(30, 35, 40, 0.08)",

                    fontSize:
                      "12px",
                  }}
                />

                <Area
                  type="monotone"
                  dataKey="p"
                  name="Evaluaciones"
                  stroke="var(--opuesto)"
                  strokeWidth={2.5}
                  fill="url(#dashboardTrendFill)"
                  activeDot={{
                    r: 4,
                    fill: "var(--opuesto)",
                  }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            <div
              className={
                styles.emptyChart
              }
              aria-hidden="true"
            >
              <span
                className={
                  styles.emptyLineOne
                }
              />

              <span
                className={
                  styles.emptyLineTwo
                }
              />

              <span
                className={
                  styles.emptyLineThree
                }
              />

              <span
                className={
                  styles.emptyPoint
                }
              />
            </div>

            <div
              className={
                styles.emptyCopy
              }
            >
              <strong>
                Sin datos de
                evolución todavía
              </strong>

              <p>
                El gráfico se
                completará a medida
                que se registren
                evaluaciones.
              </p>
            </div>
          </div>
        )}
      </article>

      {/* ===============================================
          ACTIVIDAD RECIENTE
      =============================================== */}

      <article
        className={`${styles.card} ${styles.activity}`}
      >
        <div
          className={
            styles.cardHeading
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Lo último
            </p>

            <h2>
              Actividad reciente
            </h2>
          </div>

          <span
            className={
              styles.activityCount
            }
          >
            {actividades.length}{" "}
            {actividades.length ===
            1
              ? "registro"
              : "registros"}
          </span>
        </div>

        {actividades.length ? (
          <div
            className={
              styles.activityList
            }
          >
            {actividades.map(
              (
                actividad,
                index,
              ) => (
                <div
                  key={`${actividad.titulo}-${index}`}
                  className={
                    styles.activityItem
                  }
                >
                  <div
                    className={
                      styles.timelineMarker
                    }
                    aria-hidden="true"
                  >
                    <span />
                  </div>

                  <div
                    className={
                      styles.activityCopy
                    }
                  >
                    <h3>
                      {
                        actividad.titulo
                      }
                    </h3>

                    <p>
                      {
                        actividad.subtitulo
                      }
                    </p>
                  </div>

                  <time
                    className={
                      styles.activityTime
                    }
                  >
                    {
                      actividad.tiempo
                    }
                  </time>
                </div>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            <div
              className={
                styles.emptyTimeline
              }
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
            </div>

            <div
              className={
                styles.emptyCopy
              }
            >
              <strong>
                Sin actividad
                reciente
              </strong>

              <p>
                Las últimas
                evaluaciones
                aparecerán en este
                espacio.
              </p>
            </div>
          </div>
        )}
      </article>

      {/* ===============================================
          DISTRIBUCIÓN
      =============================================== */}

      <article
        className={`${styles.card} ${styles.usage}`}
      >
        <div
          className={
            styles.cardHeading
          }
        >
          <div>
            <p
              className={
                styles.eyebrow
              }
            >
              Distribución
            </p>

            <h2>
              Análisis de tests
            </h2>
          </div>

          <span
            className={
              styles.chartCaption
            }
          >
            Participación sobre el
            total
          </span>
        </div>

        {dataNiveles.length ? (
          <div
            className={
              styles.chart
            }
          >
            <ResponsiveContainer
              width="100%"
              height="100%"
            >
              <BarChart
                data={
                  dataNiveles
                }
                margin={{
                  top: 20,
                  right: 8,
                  left: 8,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="var(--gris)"
                  strokeDasharray="3 5"
                />

                <XAxis
                  dataKey="label"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fill: "var(--font-color)",
                    fontSize: 11,
                  }}
                  tickFormatter={(
                    label: string,
                  ) =>
                    label.length >
                    12
                      ? `${label.slice(
                          0,
                          11,
                        )}…`
                      : label
                  }
                />

                <Tooltip
                  formatter={(
                    value,
                  ) => [
                    `${value}%`,
                    "Participación",
                  ]}
                  contentStyle={{
                    background:
                      "#ffffff",

                    border:
                      "1px solid #e8eaed",

                    borderRadius:
                      "10px",

                    boxShadow:
                      "0 8px 24px rgba(30, 35, 40, 0.08)",

                    fontSize:
                      "12px",
                  }}
                />

                <Bar
                  dataKey="valor"
                  name="Participación"
                  radius={[
                    7, 7, 2, 2,
                  ]}
                  maxBarSize={48}
                >
                  {dataNiveles.map(
                    (nivel) => (
                      <Cell
                        key={
                          nivel.label
                        }
                        fill={
                          nivel.color
                        }
                      />
                    ),
                  )}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div
            className={
              styles.emptyState
            }
          >
            <div
              className={
                styles.emptyBars
              }
              aria-hidden="true"
            >
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <div
              className={
                styles.emptyCopy
              }
            >
              <strong>
                Sin resultados para
                analizar
              </strong>

              <p>
                La distribución se
                mostrará cuando haya
                evaluaciones
                completadas.
              </p>
            </div>
          </div>
        )}
      </article>
    </section>
  );
}