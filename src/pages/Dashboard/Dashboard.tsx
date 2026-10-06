import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  type Timestamp,
} from "firebase/firestore";

import { db } from "../../firebase/firebase";

import LoadingState from "../../components/Loading/LoadingState";

import styles from "./Dashboard.module.css";

/* =========================================================
   TYPES
========================================================= */

type Activity = {
  titulo: string;
  subtitulo: string;
  tiempo: string;
};

type TestLevel = {
  label: string;
  valor: number;
  cantidad: number;
};

type ChartPoint = {
  name: string;
  p: number;
};

/* =========================================================
   HELPERS
========================================================= */

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Buenos días";
  if (hour < 19) return "Buenas tardes";

  return "Buenas noches";
}

function normalizarNombreTest(nombre: string) {
  if (!nombre) return "Sin datos";

  return nombre.toUpperCase();
}

/* =========================================================
   COMPONENT
========================================================= */

export default function Dashboard() {
  const navigate = useNavigate();

  const [totalPacientes, setTotalPacientes] =
    useState(0);

  const [totalEvaluaciones, setTotalEvaluaciones] =
    useState(0);

  const [testMasUsado, setTestMasUsado] =
    useState("Sin datos");

  const [actividades, setActividades] =
    useState<Activity[]>([]);

  const [dataNiveles, setDataNiveles] =
    useState<TestLevel[]>([]);

  const [dataGrafico, setDataGrafico] =
    useState<ChartPoint[]>([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     RELATIVE TIME
  ======================================================= */

  const calcularTiempoRelativo = (
    timestamp: Timestamp | undefined,
  ) => {
    if (!timestamp?.toDate) {
      return "Reciente";
    }

    const fecha = timestamp.toDate();

    const diff =
      (Date.now() - fecha.getTime()) / 1000;

    if (diff < 60) {
      return "Ahora";
    }

    if (diff < 3600) {
      return `Hace ${Math.floor(diff / 60)} min`;
    }

    if (diff < 86400) {
      return `Hace ${Math.floor(diff / 3600)} hs`;
    }

    return fecha.toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    });
  };

  /* =======================================================
     DATA
  ======================================================= */

  useEffect(() => {
    const fetchData = async () => {
      try {
        /* -------------------------------------------------
           PACIENTES + RESULTADOS
        ------------------------------------------------- */

        const pacientesSnap =
          await getDocs(
            collection(db, "pacientes"),
          );

        const resultadosSnap =
          await getDocs(
            collection(db, "resultados"),
          );

        const resultados =
          resultadosSnap.docs.map(
            (documento) => documento.data(),
          );

        setTotalPacientes(
          pacientesSnap.size,
        );

        setTotalEvaluaciones(
          resultados.length,
        );

        /* -------------------------------------------------
           PATIENT NAME
        ------------------------------------------------- */

        const convertir = (
          pacienteId: string | undefined,
        ): string | undefined => {
          const paciente =
            pacientesSnap.docs.find(
              (documento) =>
                documento.id === pacienteId,
            );

          return paciente?.data().nombre;
        };

        /* -------------------------------------------------
           TEST DISTRIBUTION
        ------------------------------------------------- */

        const conteo: Record<string, number> =
          {};

        resultados.forEach((resultado) => {
          const test =
            resultado.testId ||
            "Sin nombre";

          conteo[test] =
            (conteo[test] || 0) + 1;
        });

        const total =
          resultados.length || 1;

        const niveles =
          Object.keys(conteo)
            .map((test) => ({
              label: test,
              cantidad: conteo[test],
              valor: Math.round(
                (conteo[test] / total) * 100,
              ),
            }))
            .sort(
              (a, b) =>
                b.cantidad - a.cantidad,
            );

        setDataNiveles(
          niveles.slice(0, 5),
        );

        setTestMasUsado(
          niveles.length
            ? niveles[0].label
            : "Sin datos",
        );

        /* -------------------------------------------------
           MONTHLY EVOLUTION
        ------------------------------------------------- */

        const meses: Record<string, number> =
          {};

        resultados.forEach((resultado) => {
          if (!resultado.fecha?.toDate) {
            return;
          }

          const fecha =
            resultado.fecha.toDate();

          const key =
            `${fecha.getFullYear()}-${fecha.getMonth()}`;

          meses[key] =
            (meses[key] || 0) + 1;
        });

        const mesesOrdenados =
          Object.keys(meses)
            .sort()
            .slice(-6);

        const grafico =
          mesesOrdenados.map((key) => {
            const [year, month] =
              key.split("-");

            const fecha =
              new Date(
                Number(year),
                Number(month),
              );

            return {
              name:
                fecha
                  .toLocaleString(
                    "es-AR",
                    {
                      month: "short",
                    },
                  )
                  .replace(".", "")
                  .toUpperCase(),

              p: meses[key],
            };
          });

        setDataGrafico(grafico);

        /* -------------------------------------------------
           ACTIVITY
        ------------------------------------------------- */

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
                  data.testId ||
                  "Evaluación",

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
     DERIVED
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

  const totalPeriodo =
    useMemo(
      () =>
        dataGrafico.reduce(
          (total, punto) =>
            total + punto.p,
          0,
        ),
      [dataGrafico],
    );

  const principal =
    dataNiveles[0];

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return (
      <LoadingState message="Cargando panel..." />
    );
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className={styles.dashboard}>
      {/* ===================================================
          EDITORIAL HERO
      =================================================== */}

      <section className={styles.hero}>
        <div
          className={styles.heroAmbient}
          aria-hidden="true"
        >
          <span
            className={styles.heroOrbOne}
          />

          <span
            className={styles.heroOrbTwo}
          />

          <span
            className={styles.heroRing}
          />
        </div>

        <div className={styles.heroMain}>
          <div className={styles.heroMeta}>
          </div>

          <h1>
            {getGreeting()}.
          </h1>

          <p className={styles.heroDescription}>
            Tu espacio clínico, pacientes y
            evaluaciones en un solo lugar.
          </p>

          <div className={styles.heroStatus}>
            <span
              className={styles.statusLight}
            />

            <span>
              Sistema operativo
            </span>

            <span
              className={styles.statusDivider}
            />

            <span>
              Datos actualizados
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          METRICS
      =================================================== */}

      <section
        className={styles.metrics}
        aria-label="Resumen general"
      >
        <article className={styles.metric}>

          <div>
            <strong>
              {totalPacientes}
            </strong>

            <p>Pacientes</p>

            <small>
              Personas registradas
            </small>
          </div>

          <span
            className={styles.metricMark}
            aria-hidden="true"
          />
        </article>

        <article className={styles.metric}>
          <div>
            <strong>
              {totalEvaluaciones}
            </strong>

            <p>Evaluaciones</p>

            <small>
              Resultados completados
            </small>
          </div>

          <span
            className={styles.metricMark}
            aria-hidden="true"
          />
        </article>

        <article className={styles.metric}>
            <strong
              className={styles.metricTest}
            >
              {normalizarNombreTest(
                testMasUsado,
              )}
            </strong>

            <p>Más utilizado</p>

            <small>
              Mayor frecuencia
            </small>

          <span
            className={styles.metricMark}
            aria-hidden="true"
          />
        </article>
      </section>

      {/* ===================================================
          CLINICAL GRID
      =================================================== */}

      <section
        className={styles.clinicalGrid}
      >
        {/* ===============================================
            CHART
        =============================================== */}

        <article className={styles.chartPanel}>
          <header
            className={styles.sectionHeader}
          >
            <div>
              <h2>
                Pulso de evaluaciones
              </h2>

              <p>
                Evolución de resultados
                completados durante los
                últimos meses.
              </p>
            </div>

            <div
              className={
                styles.chartHeadline
              }
            >
              <strong>
                {totalPeriodo}
              </strong>

              <span>
                últimos 6 meses
              </span>
            </div>
          </header>

          {dataGrafico.length ? (
            <div
              className={styles.chart}
            >
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <AreaChart
                  data={dataGrafico}
                  margin={{
                    top: 30,
                    right: 10,
                    left: -22,
                    bottom: 0,
                  }}
                >
                  <defs>
                    <linearGradient
                      id="joinClinicalArea"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#ff8800"
                        stopOpacity={0.3}
                      />

                      <stop
                        offset="45%"
                        stopColor="#ffb000"
                        stopOpacity={0.11}
                      />

                      <stop
                        offset="100%"
                        stopColor="#ffb000"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>

                  <CartesianGrid
                    vertical={false}
                    stroke="rgba(53, 37, 28, 0.07)"
                  />

                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{
                      fill:
                        "var(--text-subtle)",
                      fontSize: 10,
                      fontWeight: 600,
                    }}
                    dy={12}
                  />

                  <YAxis
                    allowDecimals={false}
                    axisLine={false}
                    tickLine={false}
                    width={36}
                    tick={{
                      fill:
                        "var(--text-subtle)",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    cursor={{
                      stroke:
                        "rgba(255, 136, 0, 0.18)",
                    }}
                    contentStyle={{
                      background:
                        "var(--surface)",
                      border:
                        "1px solid var(--border-soft)",
                      borderRadius: "8px",
                      boxShadow:
                        "var(--shadow)",
                      fontSize:
                        "var(--font-size-small)",
                    }}
                  />

                  <Area
                    type="monotone"
                    dataKey="p"
                    name="Evaluaciones"
                    stroke="#ff8800"
                    strokeWidth={3}
                    fill="url(#joinClinicalArea)"
                    activeDot={{
                      r: 5,
                      fill: "#ff8800",
                      stroke: "#ffffff",
                      strokeWidth: 3,
                    }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div
              className={styles.emptyChart}
            >
              <span
                className={styles.emptyPulse}
              />

              <strong>
                Esperando actividad
              </strong>

              <p>
                El pulso aparecerá cuando
                existan evaluaciones
                registradas.
              </p>
            </div>
          )}

          <footer
            className={styles.chartFooter}
          >
            <span>
              RESULTADOS / MES
            </span>

            <span>
              JOIN SOLUTION · CLINICAL DATA
            </span>
          </footer>
        </article>

        {/* ===============================================
            ACTIVITY
        =============================================== */}

        <aside
          className={styles.activityPanel}
        >

          <div
            className={
              styles.activityTitle
            }
          >
            <h2>
              Últimos
              <br />
              movimientos.
            </h2>

            <span
              aria-hidden="true"
            >
              ↘
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
                  <article
                    key={`${actividad.titulo}-${index}`}
                    className={
                      styles.activityItem
                    }
                  >
                    <div
                      className={
                        styles.activityRail
                      }
                      aria-hidden="true"
                    >
                      <span />

                      {index <
                        actividades.length -
                          1 && <i />}
                    </div>

                    <div
                      className={
                        styles.activityCopy
                      }
                    >
                      <div>
                        <strong>
                          {normalizarNombreTest(
                            actividad.titulo,
                          )}
                        </strong>

                        <time>
                          {
                            actividad.tiempo
                          }
                        </time>
                      </div>

                      <p>
                        {
                          actividad.subtitulo
                        }
                      </p>
                    </div>
                  </article>
                ),
              )}
            </div>
          ) : (
            <div
              className={
                styles.emptyActivity
              }
            >
              <strong>
                Sin movimientos
              </strong>

              <p>
                La actividad reciente
                aparecerá en este espacio.
              </p>
            </div>
          )}
        </aside>
      </section>

      {/* ===================================================
          DISTRIBUTION
      =================================================== */}

      <section
        className={styles.distribution}
      >
        <header
          className={
            styles.distributionHeader
          }
        >
          <div>
            <h2>
              Distribución de uso
            </h2>

            <p>
              Cómo se reparte la actividad
              entre las evaluaciones
              realizadas.
            </p>
          </div>

          {principal && (
            <div
              className={
                styles.leadingTest
              }
            >
              <span>
                Test principal
              </span>

              <strong>
                {normalizarNombreTest(
                  principal.label,
                )}
              </strong>

              <small>
                {principal.valor}% del total
              </small>
            </div>
          )}
        </header>

        {dataNiveles.length ? (
          <div
            className={
              styles.distributionList
            }
          >
            {dataNiveles.map(
              (nivel, index) => (
                <article
                  className={
                    styles.distributionRow
                  }
                  key={nivel.label}
                >
                  <span
                    className={
                      styles.distributionIndex
                    }
                  >
                    {String(
                      index + 1,
                    ).padStart(2, "0")}
                  </span>

                  <div
                    className={
                      styles.distributionName
                    }
                  >
                    <strong>
                      {normalizarNombreTest(
                        nivel.label,
                      )}
                    </strong>

                    <span>
                      {nivel.cantidad}{" "}
                      {nivel.cantidad === 1
                        ? "resultado"
                        : "resultados"}
                    </span>
                  </div>

                  <div
                    className={
                      styles.distributionTrack
                    }
                    aria-hidden="true"
                  >
                    <span
                      style={{
                        width: `${nivel.valor}%`,
                      }}
                    />
                  </div>

                  <strong
                    className={
                      styles.distributionValue
                    }
                  >
                    {nivel.valor}
                    <small>%</small>
                  </strong>
                </article>
              ),
            )}
          </div>
        ) : (
          <div
            className={
              styles.emptyDistribution
            }
          >
            Todavía no hay resultados para
            distribuir.
          </div>
        )}
      </section>
    </main>
  );
}