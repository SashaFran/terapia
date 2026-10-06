import { useEffect, useMemo, useState } from "react";

import { Link } from "react-router-dom";

import { collection, getDocs, type DocumentData } from "firebase/firestore";

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
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
import CalendarMonthOutlined from "@mui/icons-material/CalendarMonthOutlined";
import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";

import { db } from "../../firebase/firebase";
import { useAuth } from "../../context/AuthContext";
import LoadingState from "../../components/Loading/LoadingState";

import styles from "./Dashboard.module.css";

type RecordData = DocumentData & {
  id: string;
};

type AccessStatus = "available" | "upcoming" | "finished" | "unscheduled";

type PatientAccess = {
  patient: RecordData;
  start: Date | null;
  end: Date | null;
  status: AccessStatus;
};

function dateOf(value: unknown): Date | null {
  if (!value) return null;

  const timestamp = value as {
    toDate?: () => Date;
    seconds?: number;
  };

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

  if (!date) {
    return "Fecha no registrada";
  }

  const seconds = (Date.now() - date.getTime()) / 1000;

  if (seconds >= 0 && seconds < 60) {
    return "Ahora";
  }

  if (seconds >= 60 && seconds < 3600) {
    return `Hace ${Math.floor(seconds / 60)} min`;
  }

  if (seconds >= 3600 && seconds < 86400) {
    return `Hace ${Math.floor(seconds / 3600)} h`;
  }

  return date.toLocaleDateString("es-AR");
}

const testName = (value: unknown) =>
  String(value || "Test sin identificar")
    .replace(/_/g, " ")
    .toUpperCase();

function formatAccessDate(date: Date | null) {
  if (!date) {
    return "Sin fecha";
  }

  return date
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
    })
    .replace(".", "")
    .toUpperCase();
}

function formatAccessTime(date: Date | null) {
  if (!date) {
    return null;
  }

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function accessStatusLabel(status: AccessStatus) {
  switch (status) {
    case "available":
      return "Disponible";

    case "upcoming":
      return "Próximo";

    case "finished":
      return "Finalizado";

    default:
      return "Sin período";
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  const [patients, setPatients] = useState<RecordData[]>([]);

  const [results, setResults] = useState<RecordData[]>([]);

  const [assignments, setAssignments] = useState<RecordData[]>([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(false);

  const [revision, setRevision] = useState(0);

  const [range, setRange] = useState(6);

  const [calendarDate, setCalendarDate] = useState(() => new Date());

  useEffect(() => {
    let active = true;

    Promise.all(
      ["pacientes", "resultados", "asignaciones"].map((name) =>
        getDocs(collection(db, name)),
      ),
    )
      .then(([patientSnapshot, resultSnapshot, assignmentSnapshot]) => {
        if (!active) {
          return;
        }

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
        if (active) {
          setError(true);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [revision]);

  const summary = useMemo(() => {
    const now = new Date();

    const activePatients = patients.filter((patient) => {
      const start = dateOf(patient.fechaInicioAcceso);

      const end = dateOf(patient.fechaFinAcceso);

      const accessState = String(patient.accesoEstado || "").toLowerCase();

      return (
        patient.activo !== false &&
        !["abandonada", "finalizada", "vencida"].includes(accessState) &&
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

      const started = assignments.filter((assignment) => {
        const assigned = dateOf(
          assignment.fechaAsignacion ||
            assignment.fecha ||
            assignment.fechaProgramada ||
            assignment.createdAt,
        );

        return (
          assigned &&
          assigned.getFullYear() === date.getFullYear() &&
          assigned.getMonth() === date.getMonth()
        );
      }).length;

      return {
        month: date.toLocaleDateString("es-AR", {
          month: "short",
          year: "2-digit",
        }),

        count,
        started,
      };
    });
  }, [assignments, range, results]);

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

  const names = useMemo(
    () =>
      new Map(
        patients.map((patient) => [patient.id, patient.nombre || "Sin nombre"]),
      ),
    [patients],
  );

  /*
   * Accesos reales de pacientes.
   *
   * "Disponible" NO significa que el
   * paciente esté usando la plataforma.
   * Significa únicamente que su ventana
   * de acceso está vigente ahora.
   */
  const patientAccesses = useMemo<PatientAccess[]>(() => {
    const now = new Date();

    return patients
      .map((patient) => {
        const start = dateOf(patient.fechaInicioAcceso);

        const end = dateOf(patient.fechaFinAcceso);

        const accessState = String(patient.accesoEstado || "").toLowerCase();

        let status: AccessStatus;

        if (!start && !end) {
          status = "unscheduled";
        } else if (
          start &&
          start <= now &&
          (!end || end > now) &&
          patient.activo !== false &&
          !["abandonada", "finalizada", "vencida"].includes(accessState)
        ) {
          status = "available";
        } else if (start && start > now) {
          status = "upcoming";
        } else {
          status = "finished";
        }

        return {
          patient,
          start,
          end,
          status,
        };
      })
      .sort((a, b) => {
        const priority: Record<AccessStatus, number> = {
          available: 0,
          upcoming: 1,
          finished: 2,
          unscheduled: 3,
        };

        const byStatus = priority[a.status] - priority[b.status];

        if (byStatus !== 0) {
          return byStatus;
        }

        const dateA =
          a.start?.getTime() ?? a.end?.getTime() ?? Number.MAX_SAFE_INTEGER;

        const dateB =
          b.start?.getTime() ?? b.end?.getTime() ?? Number.MAX_SAFE_INTEGER;

        return dateA - dateB;
      });
  }, [patients]);

  /*
   * En seguimiento mostramos únicamente
   * accesos que están vigentes o que
   * realmente comenzarán en el futuro.
   */
  const visibleAccesses = useMemo(
    () =>
      patientAccesses
        .filter(
          (access) =>
            access.status === "available" || access.status === "upcoming",
        )
        .slice(0, 3),

    [patientAccesses],
  );

  const nextAccess = useMemo(
    () =>
      patientAccesses.find((access) => access.status === "upcoming") ?? null,

    [patientAccesses],
  );

  /*
   * Calendario real.
   *
   * Amarillo = hoy.
   * Rojo = al menos un paciente tuvo
   * una ventana de acceso disponible
   * durante ese día.
   */
  const calendar = useMemo(() => {
    const today = new Date();

    const year = calendarDate.getFullYear();

    const month = calendarDate.getMonth();

    const firstDay = new Date(year, month, 1);

    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const offset = (firstDay.getDay() + 6) % 7;

    const accessDays = new Set<number>();

    patients.forEach((patient) => {
      const start = dateOf(patient.fechaInicioAcceso);

      const end = dateOf(patient.fechaFinAcceso);

      if (!start && !end) {
        return;
      }

      /*
       * Si sólo existe uno de los dos
       * extremos, marcamos únicamente
       * ese día. No inventamos una
       * duración inexistente.
       */
      const firstAccessDay = new Date(start ?? end!);

      const lastAccessDay = new Date(end ?? start!);

      firstAccessDay.setHours(0, 0, 0, 0);

      lastAccessDay.setHours(0, 0, 0, 0);

      const cursor = new Date(firstAccessDay);

      while (cursor <= lastAccessDay) {
        if (cursor.getFullYear() === year && cursor.getMonth() === month) {
          accessDays.add(cursor.getDate());
        }

        cursor.setDate(cursor.getDate() + 1);
      }
    });

    const isCurrentMonth =
      today.getFullYear() === year && today.getMonth() === month;

    return {
      title: calendarDate.toLocaleDateString("es-AR", {
        month: "long",
        year: "numeric",
      }),

      today: isCurrentMonth ? today.getDate() : null,

      accessDays,

      days: Array.from(
        {
          length: offset + daysInMonth,
        },
        (_, index) => (index < offset ? null : index - offset + 1),
      ),
    };
  }, [calendarDate, patients]);

  const previousMonth = () => {
    setCalendarDate(
      (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1),
    );
  };

  const nextMonth = () => {
    setCalendarDate(
      (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1),
    );
  };

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
      new Blob(["\uFEFF", csv], {
        type: "text/csv;charset=utf-8",
      }),
    );

    const link = document.createElement("a");

    link.href = url;

    link.download = `resumen-joinsolution-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;

    link.click();

    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <LoadingState message="Cargando panel…" />;
  }

  if (error) {
    return (
      <div className={styles.error} role="alert">
        <h1>No se pudo cargar el dashboard</h1>

        <p>
          No se muestran cifras porque no pudimos consultar la base de datos.
        </p>

        <button
          type="button"
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
  }

  const metrics = [
    {
      label: "Pacientes activos",

      value: summary.activePatients,

      detail: `${summary.newPatients} nuevos esta semana`,

      accent: `+${summary.newPatients}`,

      icon: <PeopleOutline />,
    },

    {
      label: "Evaluaciones",

      value: results.length,

      detail: "Resultados registrados",

      accent: `+${summary.completed}`,

      icon: <AssignmentOutlined />,
    },

    {
      label: "Tasa de finalización",

      value: summary.rate === null ? "—" : `${summary.rate}%`,

      detail: `${summary.completed} de ${assignments.length} asignaciones completadas`,

      accent: summary.rate === null ? "—" : `${summary.rate}%`,

      icon: <TrendingUpOutlined />,
    },

    {
      label: "Test más utilizado",

      value: topTest?.name || "Sin datos",

      detail: topTest
        ? `${topTest.count} resultados registrados`
        : "Todavía no hay resultados",

      accent: topTest ? String(topTest.count) : "—",

      icon: <AutoAwesomeOutlined />,
    },
  ];

  return (
    <div className={styles.dashboard}>
      <section className={styles.hero}>
        <div className={styles.heroCopy}>
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

          <p>Todo lo que necesitas para acompañar tu proceso de selección.</p>
        </div>

        <div className={styles.heroActions}>
          <span className={styles.period}>Esta semana</span>

          <button
            type="button"
            className={styles.export}
            onClick={exportSummary}
          >
            <DownloadOutlined fontSize="small" />
            Descargar resumen
          </button>
        </div>
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

              <span className={styles.metricAccent}>{metric.accent}</span>
            </article>
          ))}
        </section>

        <section className={styles.grid}>
          <article className={`${styles.panel} ${styles.chartPanel}`}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>RENDIMIENTO</p>

                <h2>Pulso de evaluaciones</h2>

                <p>Resultados completados durante los últimos meses.</p>
              </div>

              <div className={styles.ranges} aria-label="Rango temporal">
                {[6, 12].map((months) => (
                  <button
                    type="button"
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

              <span>evaluaciones completadas</span>
            </div>

            {chart.some((point) => point.count > 0 || point.started > 0) ? (
              <div
                className={styles.chart}
                role="img"
                aria-label={`Evaluaciones completadas por mes en los últimos ${range} meses`}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chart}
                    margin={{
                      top: 10,
                      right: 10,
                      left: -22,
                      bottom: 0,
                    }}
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
                          stopOpacity={0.32}
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
                      tick={{
                        fill: "#85837c",
                        fontSize: 9,
                      }}
                    />

                    <YAxis
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: "#85837c",
                        fontSize: 9,
                      }}
                    />

                    <Legend
                      align="right"
                      verticalAlign="top"
                      height={20}
                      iconSize={6}
                      wrapperStyle={{
                        color: "#85837c",
                        fontSize: "var(--font-size-small)",
                        top: 0, 
                      }}
                    />

                    <Tooltip
                      contentStyle={{
                        background: "#24231f",
                        border: "1px solid #ffffff15",
                        borderRadius: 8,
                        color: "#f7f4ed",
                      }}
                    />

                    <Area
                      dataKey="count"
                      name="Completadas"
                      type="monotone"
                      stroke="#ff9d00"
                      strokeWidth={2}
                      fill="url(#evaluationFill)"
                    />

                    <Line
                      dataKey="started"
                      name="Iniciadas"
                      type="monotone"
                      stroke="#aaa18a"
                      strokeWidth={2}
                      strokeDasharray="4 5"
                      dot={false}
                      activeDot={false}
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

          <aside className={`${styles.panel} ${styles.agenda}`}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>AGENDA</p>

                <h2 className={styles.calendarTitle}>{calendar.title}</h2>
              </div>

              <div
                className={styles.calendarControls}
                aria-label="Navegación del calendario"
              >
                <button
                  type="button"
                  aria-label="Mes anterior"
                  onClick={previousMonth}
                >
                  <ChevronLeft />
                </button>

                <button
                  type="button"
                  aria-label="Mes siguiente"
                  onClick={nextMonth}
                >
                  <ChevronRight />
                </button>
              </div>
            </header>

            <div className={styles.calendarWeek}>
              {["L", "M", "X", "J", "V", "S", "D"].map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className={styles.calendarGrid}>
              {calendar.days.map((day, index) => {
                const isToday = day !== null && day === calendar.today;

                const hasAccess = day !== null && calendar.accessDays.has(day);

                return (
                  <span
                    key={`${day}-${index}`}
                    className={isToday ? styles.selectedDay : ""}
                    title={
                      hasAccess
                        ? "Hubo una cuenta disponible este día"
                        : undefined
                    }
                  >
                    {day}

                    {hasAccess ? (
                      <i className={styles.accessDot} aria-hidden="true" />
                    ) : null}
                  </span>
                );
              })}
            </div>

            <div className={styles.nextSession}>
              {nextAccess ? (
                <>
                  <div className={styles.nextAccessCopy}>
                    <span className={styles.nextAccessLabel}>
                      PRÓXIMO ACCESO
                    </span>

                    <strong>{nextAccess.patient.nombre || "Paciente"}</strong>
                  </div>

                  <span className={styles.nextAccessDate}>
                    <CalendarMonthOutlined />

                    {formatAccessDate(nextAccess.start)}

                    {formatAccessTime(nextAccess.start) ? (
                      <small>{formatAccessTime(nextAccess.start)}</small>
                    ) : null}
                  </span>
                </>
              ) : (
                <>
                  <div className={styles.nextAccessCopy}>
                    <span className={styles.nextAccessLabel}>ACCESOS</span>

                    <strong>Sin próximos accesos</strong>
                  </div>

                  <span className={styles.nextAccessEmpty}>Agenda libre</span>
                </>
              )}
            </div>
          </aside>
        </section>

        <section className={styles.grid}>
          <article className={`${styles.panel} ${styles.sessionsPanel}`}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>SEGUIMIENTO</p>

                <h2>Accesos de pacientes</h2>
              </div>

              <Link to="/admin/pacientes" className={styles.panelLink}>
                Ver todos
                <ChevronRight />
              </Link>
            </header>

            {visibleAccesses.length ? (
              <div className={styles.sessions}>
                {visibleAccesses.map((access) => {
                  const patientName =
                    access.patient.nombre || "Paciente sin nombre";

                  const initials = patientName
                    .split(/\s+/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part: any) => part[0])
                    .join("")
                    .toUpperCase();

                  const assignedTests = assignments
                    .filter(
                      (assignment) =>
                        assignment.pacienteId === access.patient.id,
                    )
                    .map((assignment) => testName(assignment.testId));

                  const uniqueTests = [...new Set(assignedTests)];

                  const testsLabel =
                    uniqueTests.length === 0
                      ? "Sin test"
                      : uniqueTests.length === 1
                        ? uniqueTests[0]
                        : `${uniqueTests[0]} +${uniqueTests.length - 1}`;

                  /*
                   * Si está disponible
                   * mostramos hasta
                   * cuándo. Si es futuro,
                   * mostramos cuándo
                   * comienza.
                   */
                  const displayDate =
                    access.status === "available" ? access.end : access.start;

                  return (
                    <div className={styles.sessionRow} key={access.patient.id}>
                      <span className={styles.sessionAvatar}>
                        {initials || "?"}
                      </span>

                      <div className={styles.sessionPerson}>
                        <strong>{patientName}</strong>

                        <small>
                          {access.status === "available"
                            ? "Acceso habilitado"
                            : "Acceso programado"}
                        </small>
                      </div>

                      <span
                        className={styles.testBadge}
                        title={uniqueTests.join(", ")}
                      >
                        {testsLabel}
                      </span>

                      <span className={styles.sessionDate}>
                        <CalendarMonthOutlined />

                        <span>{formatAccessDate(displayDate)}</span>

                        {formatAccessTime(displayDate) ? (
                          <small>{formatAccessTime(displayDate)}</small>
                        ) : null}
                      </span>

                      <span
                        className={`${styles.accessStatus} ${
                          access.status === "available"
                            ? styles.accessAvailable
                            : styles.accessUpcoming
                        }`}
                      >
                        <i />

                        {accessStatusLabel(access.status)}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className={styles.empty}>
                No hay accesos disponibles ni programados.
              </div>
            )}
          </article>

          <aside className={`${styles.panel} ${styles.activityPanel}`}>
            <header className={styles.panelHeader}>
              <div>
                <p className={styles.kicker}>ACTIVIDAD</p>

                <h2>Últimos movimientos.</h2>
              </div>

              <ChevronRight className={styles.activityArrow} />
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

                      <div className={styles.activityDetails}>
                        <p>Completó {testName(result.testId)}</p>

                        <small>{relativeTime(result.fecha)}</small>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className={styles.empty}>
                La actividad aparecerá cuando se registren resultados.
              </div>
            )}
          </aside>
        </section>
      </div>
    </div>
  );
}
