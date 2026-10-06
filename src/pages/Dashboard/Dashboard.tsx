import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { collection, getDocs, type DocumentData } from "firebase/firestore";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import TrendingUpOutlined from "@mui/icons-material/TrendingUpOutlined";
import AutoAwesomeOutlined from "@mui/icons-material/AutoAwesomeOutlined";
import DownloadOutlined from "@mui/icons-material/DownloadOutlined";
import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "../../components/Loading/LoadingState";
import styles from "./Dashboard.module.css";

type RecordData = DocumentData & { id: string };
function dateOf(value: unknown): Date | null {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : typeof timestamp.seconds === "number"
        ? new Date(timestamp.seconds * 1000)
        : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}
function relativeTime(value: unknown) {
  const date = dateOf(value);
  if (!date) return "Fecha no registrada";
  const seconds = (Date.now() - date.getTime()) / 1000;
  if (seconds >= 0 && seconds < 60) return "Ahora";
  if (seconds >= 60 && seconds < 3600)
    return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds >= 3600 && seconds < 86400)
    return `Hace ${Math.floor(seconds / 3600)} h`;
  return date.toLocaleDateString("es-AR");
}
const testName = (value: unknown) =>
  String(value || "Test sin identificar")
    .replace(/_/g, " ")
    .toUpperCase();

export default function Dashboard() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<RecordData[]>([]);
  const [results, setResults] = useState<RecordData[]>([]);
  const [assignments, setAssignments] = useState<RecordData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [range, setRange] = useState(6);

  useEffect(() => {
    let active = true;
    Promise.all(
      ["pacientes", "resultados", "asignaciones"].map((name) =>
        getDocs(collection(db, name)),
      ),
    )
      .then(([patientSnapshot, resultSnapshot, assignmentSnapshot]) => {
        if (!active) return;
        const records = (snapshot: typeof patientSnapshot) =>
          snapshot.docs.map((document) => ({
            ...document.data(),
            id: document.id,
          }));
        setPatients(records(patientSnapshot));
        setResults(records(resultSnapshot));
        setAssignments(records(assignmentSnapshot));
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const summary = useMemo(() => {
    const now = new Date();
    const activePatients = patients.filter((patient) => {
      const start = dateOf(patient.fechaInicioAcceso),
        end = dateOf(patient.fechaFinAcceso);
      return (
        patient.activo !== false &&
        !["abandonada", "finalizada", "vencida"].includes(
          patient.accesoEstado,
        ) &&
        (!start || start <= now) &&
        (!end || end > now)
      );
    }).length;
    const weekStart = new Date(now);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    const newPatients = patients.filter((patient) => {
      const date = dateOf(patient.createdAt);
      return date && date >= weekStart && date <= now;
    }).length;
    const completed = assignments.filter(
      (assignment) => assignment.estado === "completado",
    ).length;
    const counts = new Map<string, number>();
    results.forEach((result) => {
      const name = testName(result.testId);
      counts.set(name, (counts.get(name) || 0) + 1);
    });
    const distribution = [...counts]
      .map(([name, count]) => ({
        name,
        count,
        percent: results.length
          ? Math.round((count / results.length) * 100)
          : 0,
      }))
      .sort((a, b) => b.count - a.count);
    return {
      activePatients,
      newPatients,
      completed,
      rate: assignments.length
        ? Math.round((completed / assignments.length) * 100)
        : null,
      distribution,
    };
  }, [patients, results, assignments]);
  const chart = useMemo(() => {
    const now = new Date();
    return Array.from({ length: range }, (_, index) => {
      const date = new Date(
        now.getFullYear(),
        now.getMonth() - range + index + 1,
        1,
      );
      const count = results.filter((result) => {
        const recorded = dateOf(result.fecha);
        return (
          recorded &&
          recorded.getFullYear() === date.getFullYear() &&
          recorded.getMonth() === date.getMonth()
        );
      }).length;
      return {
        month: date.toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        }),
        count,
      };
    });
  }, [range, results]);
  const recent = useMemo(
    () =>
      [...results]
        .sort(
          (a, b) =>
            (dateOf(b.fecha)?.getTime() || 0) -
            (dateOf(a.fecha)?.getTime() || 0),
        )
        .slice(0, 5),
    [results],
  );
  const names = new Map(
    patients.map((patient) => [patient.id, patient.nombre || "Sin nombre"]),
  );
  const topTest = summary.distribution[0];
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Buenos días" : hour < 19 ? "Buenas tardes" : "Buenas noches";
  const name = user?.displayName || user?.email?.split("@")[0];
  const exportSummary = () => {
    const rows = [
      ["Métrica", "Resultado"],
      ["Pacientes registrados", patients.length],
      ["Pacientes activos", summary.activePatients],
      ["Nuevos esta semana", summary.newPatients],
      ["Resultados registrados", results.length],
      ["Asignaciones completadas", summary.completed],
      ["Asignaciones totales", assignments.length],
      [
        "Tasa de finalización",
        summary.rate === null ? "Sin asignaciones" : `${summary.rate}%`,
      ],
      ["Test más utilizado", topTest?.name || "Sin resultados"],
    ];
    const csv = rows
      .map((row) =>
        row
          .map(
            (value) =>
              `"${String(value)
                .replace(/^[=+@-]/, "'$&")
                .replace(/"/g, '""')}"`,
          )
          .join(","),
      )
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `resumen-joinsolution-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <LoadingState message="Cargando panel…" />;
  if (error)
    return (
      <div className={styles.error} role="alert">
        <h1>No se pudo cargar el dashboard</h1>
        <p>
          No se muestran cifras porque no pudimos consultar la base de datos.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            setRevision((value) => value + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );

  const metrics = [
    {
      label: "Pacientes activos",
      value: summary.activePatients,
      detail: `${summary.newPatients} nuevos esta semana`,
      icon: <PeopleOutline />,
    },
    {
      label: "Evaluaciones",
      value: results.length,
      detail: "Resultados registrados",
      icon: <AssignmentOutlined />,
    },
    {
      label: "Tasa de finalización",
      value: summary.rate === null ? "—" : `${summary.rate}%`,
      detail: `${summary.completed} de ${assignments.length} asignaciones completadas`,
      icon: <TrendingUpOutlined />,
    },
    {
      label: "Test más utilizado",
      value: topTest?.name || "Sin datos",
      detail: topTest
        ? `${topTest.count} resultados registrados`
        : "Todavía no hay resultados",
      icon: <AutoAwesomeOutlined />,
    },
  ];
  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>
            {new Date().toLocaleDateString("es-AR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          <h1>
            {greeting}
            {name ? (
              <>
                , <span>{name}.</span>
              </>
            ) : (
              "."
            )}
          </h1>
          <p>
            Tu espacio de pacientes, accesos y evaluaciones en un solo lugar.
          </p>
        </div>
        <button className={styles.export} onClick={exportSummary}>
          <DownloadOutlined fontSize="small" /> Descargar resumen
        </button>
      </section>
      <div className={styles.body}>
        <section className={styles.metrics} aria-label="Resumen de métricas">
          {metrics.map((metric, index) => (
            <article
              key={metric.label}
              className={`${styles.metric} ${styles[`tone${index}`]}`}
            >
              <div className={styles.metricHeading}>
                <span className={styles.metricIcon}>{metric.icon}</span>
                <span>{metric.label}</span>
              </div>
              <strong className={index === 3 ? styles.testValue : styles.value}>
                {metric.value}
              </strong>
              <p>{metric.detail}</p>
            </article>
          ))}
        </section>
        <section className={styles.grid}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>RENDIMIENTO</p>
                <h2>Pulso de evaluaciones</h2>
                <p>Resultados completados por mes.</p>
              </div>
              <div className={styles.ranges} aria-label="Rango temporal">
                {[6, 12].map((months) => (
                  <button
                    key={months}
                    aria-pressed={range === months}
                    onClick={() => setRange(months)}
                  >
                    {months === 6 ? "6 meses" : "1 año"}
                  </button>
                ))}
              </div>
            </header>
            <div className={styles.chartSummary}>
              <strong>
                {chart.reduce((total, point) => total + point.count, 0)}
              </strong>
              <span>evaluaciones en el período</span>
            </div>
            {chart.some((point) => point.count > 0) ? (
              <div
                className={styles.chart}
                role="img"
                aria-label={`Evaluaciones completadas por mes en los últimos ${range} meses`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart}
                    margin={{ top: 10, right: 10, left: -22, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="evaluationFill"
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
                          offset="100%"
                          stopColor="#ff8800"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#ffffff12" vertical={false} />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#aaa79c", fontSize: 10 }}
                    />
                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: "#aaa79c", fontSize: 10 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#fffdf8",
                        borderRadius: 10,
                        color: "#201f1b",
                      }}
                    />
                    <Area
                      dataKey="count"
                      name="Completadas"
                      type="monotone"
                      stroke="#ffb000"
                      strokeWidth={3}
                      fill="url(#evaluationFill)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className={styles.empty}>
                No hay resultados con fecha registrada en este período.
              </div>
            )}
          </article>
          <aside className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>ACTIVIDAD</p>
                <h2>Últimos movimientos</h2>
              </div>
            </header>
            {recent.length ? (
              <div className={styles.activity}>
                {recent.slice(0, 3).map((result) => (
                  <div key={result.id}>
                    <span className={styles.activityAvatar}>
                      {String(names.get(result.pacienteId) || "?")
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")}
                    </span>
                    <div>
                      <strong>
                        {names.get(result.pacienteId) ||
                          "Paciente no disponible"}
                      </strong>
                      <p>Completó {testName(result.testId)}</p>
                      <small>{relativeTime(result.fecha)}</small>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                La actividad aparecerá cuando se registren resultados.
              </div>
            )}
            <Link className={styles.panelLink} to="/admin/sesiones">
              Ver todas las sesiones →
            </Link>
          </aside>
        </section>
        <section className={styles.grid}>
          <article className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>SEGUIMIENTO</p>
                <h2>Evaluaciones recientes</h2>
              </div>
              <Link to="/admin/sesiones" className={styles.panelLink}>
                Ver todas →
              </Link>
            </header>
            <div className={styles.tableScroll}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Paciente</th>
                    <th>Test</th>
                    <th>Fecha</th>
                    <th>Perfil</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((result) => (
                    <tr key={result.id}>
                      <td>
                        {names.get(result.pacienteId) ||
                          "Paciente no disponible"}
                      </td>
                      <td>{testName(result.testId)}</td>
                      <td>
                        {dateOf(result.fecha)?.toLocaleDateString("es-AR") ||
                          "No registrada"}
                      </td>
                      <td>
                        {names.has(result.pacienteId) ? (
                          <Link
                            to={`/admin/paciente/${result.pacienteId}`}
                            aria-label={`Ver perfil de ${names.get(result.pacienteId)}`}
                          >
                            Ver perfil →
                          </Link>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!recent.length && (
              <p className={styles.empty}>
                Todavía no hay evaluaciones registradas.
              </p>
            )}
          </article>
          <aside className={styles.panel}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>DISTRIBUCIÓN</p>
                <h2>Tests más utilizados</h2>
              </div>
            </header>
            {summary.distribution.length ? (
              <div className={styles.distribution}>
                {summary.distribution.slice(0, 5).map((test) => (
                  <div key={test.name}>
                    <div>
                      <strong>{test.name}</strong>
                      <span>
                        {test.count} · {test.percent}%
                      </span>
                    </div>
                    <div className={styles.track}>
                      <span style={{ width: `${test.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                Sin resultados para calcular la distribución.
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
