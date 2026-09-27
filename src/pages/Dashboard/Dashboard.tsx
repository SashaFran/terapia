import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
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

export default function Dashboard() {
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [totalEvaluaciones, setTotalEvaluaciones] = useState(0);
  const [testMasUsado, setTestMasUsado] = useState("—");
  const [actividades, setActividades] = useState<Activity[]>([]);
  const [dataNiveles, setDataNiveles] = useState<TestLevel[]>([]);
  const [dataGrafico, setDataGrafico] = useState<ChartPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const calcularTiempoRelativo = (timestamp: Timestamp | undefined) => {
    if (!timestamp?.toDate) return "Reciente";

    const fecha = timestamp.toDate();
    const diff = (Date.now() - fecha.getTime()) / 1000;

    if (diff < 60) return "Hace segundos";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hs`;

    return fecha.toLocaleDateString("es-AR");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pacientesSnap = await getDocs(collection(db, "pacientes"));
        const resultadosSnap = await getDocs(collection(db, "resultados"));
        const resultados = resultadosSnap.docs.map((doc) => doc.data());

        setTotalPacientes(pacientesSnap.size);
        setTotalEvaluaciones(resultados.length);

        const convertir = (pacienteId: string | undefined): string | undefined => {
          const paciente = pacientesSnap.docs.find((doc) => doc.id === pacienteId);
          return paciente?.data().nombre;
        };

        const conteo: Record<string, number> = {};
        resultados.forEach((resultado) => {
          const test = resultado.testId || "Sin nombre";
          conteo[test] = (conteo[test] || 0) + 1;
        });

        const total = resultados.length || 1;
        const niveles = Object.keys(conteo)
          .map((test, i) => ({
            label: test,
            valor: Math.round((conteo[test] / total) * 100),
            color: [
              "var(--rojo)",
              "var(--naranja)",
              "var(--opuesto)",
              "var(--bordo)",
              "var(--marron)",
            ][i % 5],
          }))
          .sort((a, b) => b.valor - a.valor);

        setDataNiveles(niveles.slice(0, 5));
        if (niveles.length) setTestMasUsado(niveles[0].label);

        const meses: Record<string, number> = {};
        resultados.forEach((resultado) => {
          if (!resultado.fecha?.toDate) return;

          const fecha = resultado.fecha.toDate();
          const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
          meses[key] = (meses[key] || 0) + 1;
        });

        const mesesOrdenados = Object.keys(meses).sort().slice(-6);
        const dataGraf = mesesOrdenados.map((key) => {
          const [year, month] = key.split("-");
          const fecha = new Date(Number(year), Number(month));

          return {
            name: fecha.toLocaleString("es-AR", { month: "short" }),
            p: meses[key],
          };
        });
        setDataGrafico(dataGraf);

        const actividadQuery = query(
          collection(db, "resultados"),
          orderBy("fecha", "desc"),
          limit(6),
        );
        const actividadSnap = await getDocs(actividadQuery);

        setActividades(
          actividadSnap.docs.map((doc) => {
            const data = doc.data();
            return {
              titulo: `Evaluación ${data.testId || "—"}`,
              subtitulo: convertir(data.pacienteId) || "Paciente",
              tiempo: calcularTiempoRelativo(data.fecha),
            };
          }),
        );
      } catch (err) {
        console.error("Error dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Cargando pantalla...</div>;
  }

  const fechaActual = new Date();
  const fechaResumen = fechaActual.toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const horaResumen = fechaActual.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <section className={styles.dashboard} aria-label="Panel de control">
      <article className={`${styles.card} ${styles.summary}`}>
        <div>
          <p className={styles.eyebrow}>Resumen del día</p>
          <h1>Tu actividad clínica, en un vistazo.</h1>
          <p className={styles.summaryDate}>
            {fechaResumen} <span aria-hidden="true">·</span> {horaResumen}
          </p>
        </div>
        <div className={styles.summaryMark} aria-hidden="true">
          <span />
        </div>
      </article>

      <article className={`${styles.card} ${styles.kpis}`}>
        <p className={styles.eyebrow}>Indicadores principales</p>
        <div className={styles.kpiGrid}>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Total de pacientes</span>
            <strong>{totalPacientes}</strong>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Test más utilizado</span>
            <strong className={styles.kpiTest}>{testMasUsado}</strong>
          </div>
          <div className={styles.kpi}>
            <span className={styles.kpiLabel}>Evaluaciones realizadas</span>
            <strong>{totalEvaluaciones}</strong>
          </div>
        </div>
      </article>

      <article className={`${styles.card} ${styles.trend}`}>
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.eyebrow}>Seguimiento</p>
            <h2>Evolución clínica</h2>
          </div>
          <span className={styles.chartCaption}>Evaluaciones por mes</span>
        </div>
        {dataGrafico.length ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={dataGrafico}
                margin={{ top: 12, right: 12, left: -18, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="dashboardTrendFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--bordo)" stopOpacity={0.22} />
                    <stop offset="100%" stopColor="var(--bordo)" stopOpacity={0.01} />
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
                  tick={{ fill: "var(--gris-med)", fontSize: 12 }}
                />
                <YAxis
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--gris-med)", fontSize: 12 }}
                  width={32}
                />
                <Tooltip
                  contentStyle={{
                    border: "1px solid var(--gris)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="p"
                  name="Evaluaciones"
                  stroke="var(--bordo)"
                  strokeWidth={3}
                  fill="url(#dashboardTrendFill)"
                  activeDot={{ r: 5, fill: "var(--bordo)" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.emptyState}>Todavía no hay datos suficientes para mostrar la evolución.</p>
        )}
      </article>

      <article className={`${styles.card} ${styles.activity}`}>
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.eyebrow}>Lo último</p>
            <h2>Actividad reciente</h2>
          </div>
          <span className={styles.activityCount}>{actividades.length} registros</span>
        </div>
        {actividades.length ? (
          <div className={styles.activityList}>
            {actividades.map((actividad, index) => (
              <div key={`${actividad.titulo}-${index}`} className={styles.activityItem}>
                <span className={styles.activityDot} aria-hidden="true" />
                <div className={styles.activityCopy}>
                  <h3>{actividad.titulo}</h3>
                  <p>{actividad.subtitulo}</p>
                </div>
                <time className={styles.activityTime}>{actividad.tiempo}</time>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.emptyState}>Las evaluaciones recientes aparecerán aquí.</p>
        )}
      </article>

      <article className={`${styles.card} ${styles.usage}`}>
        <div className={styles.cardHeading}>
          <div>
            <p className={styles.eyebrow}>Distribución</p>
            <h2>Análisis de tests</h2>
          </div>
          <span className={styles.chartCaption}>Participación sobre el total</span>
        </div>
        {dataNiveles.length ? (
          <div className={styles.chart}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={dataNiveles}
                margin={{ top: 20, right: 8, left: 8, bottom: 0 }}
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
                  tick={{ fill: "var(--font-color)", fontSize: 12 }}
                  tickFormatter={(label: string) =>
                    label.length > 12 ? `${label.slice(0, 11)}…` : label
                  }
                />
                <Tooltip
                  formatter={(value) => [`${value}%`, "Participación"]}
                  contentStyle={{
                    border: "1px solid var(--gris)",
                    borderRadius: "var(--radius)",
                    boxShadow: "var(--shadow)",
                    fontSize: "12px",
                  }}
                />
                <Bar dataKey="valor" name="Participación" radius={[8, 8, 2, 2]}>
                  {dataNiveles.map((nivel) => (
                    <Cell key={nivel.label} fill={nivel.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.emptyState}>Los resultados de los tests aparecerán aquí.</p>
        )}
      </article>
    </section>
  );
}
