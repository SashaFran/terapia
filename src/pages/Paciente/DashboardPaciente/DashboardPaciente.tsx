import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import styles from "./DashboardPaciente.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";
import type { Asignacion } from "../../../models/asignacion";
import LoadingState from "../../../components/Loading/LoadingState";

type Paciente = {
  id: string;
  nombre?: string;
  fechaFinAcceso?: unknown;
  esPacienteMaestro?: boolean;
};

function convertirFecha(fecha: unknown): Date | null {
  if (!fecha) return null;

  if (typeof fecha === "object") {
    const valor = fecha as {
      toDate?: () => Date;
      seconds?: number;
    };

    if (typeof valor.toDate === "function") {
      const date = valor.toDate();
      return Number.isNaN(date.getTime()) ? null : date;
    }

    if (typeof valor.seconds === "number") {
      return new Date(valor.seconds * 1000);
    }
  }

  const date = new Date(fecha as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatearFecha(fecha: unknown) {
  const date = convertirFecha(fecha);

  if (!date) return "Sin fecha";

  return date
    .toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    .replace(".", "");
}

function formatearHora(fecha: unknown) {
  const date = convertirFecha(fecha);

  if (!date) return "—";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function DashboardPaciente() {
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);
  const [errorAsignaciones, setErrorAsignaciones] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("paciente");

    if (!data) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsed = JSON.parse(data) as Paciente;
      const fin = convertirFecha(parsed.fechaFinAcceso);

      if (!parsed.id || (!parsed.esPacienteMaestro && (!fin || new Date() >= fin))) {
        localStorage.removeItem("paciente");
        localStorage.removeItem("pacienteId");
        localStorage.removeItem("rol");

        navigate("/login", { replace: true });
        return;
      }

      setPaciente(parsed);
    } catch {
      localStorage.removeItem("paciente");
      localStorage.removeItem("pacienteId");
      localStorage.removeItem("rol");

      navigate("/login", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (!paciente?.id) return;

    let activo = true;

    const cargarAsignaciones = async () => {
      setLoadingAsignaciones(true);
      setErrorAsignaciones(false);

      try {
        const consulta = query(
          collection(db, "asignaciones"),
          where("pacienteId", "==", paciente.id),
        );

        const snapshot = await getDocs(consulta);

        const datos = snapshot.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        })) as Asignacion[];

        if (activo) {
          setAsignaciones(datos);
        }
      } catch (error) {
        console.error("Error cargando asignaciones:", error);

        if (activo) {
          setErrorAsignaciones(true);
        }
      } finally {
        if (activo) {
          setLoadingAsignaciones(false);
        }
      }
    };

    void cargarAsignaciones();

    return () => {
      activo = false;
    };
  }, [paciente?.id]);

  if (!paciente) {
    return <LoadingState message="Cargando tu información..." />;
  }

  if (loadingAsignaciones) {
    return <LoadingState message="Cargando tus evaluaciones..." />;
  }

  const total = asignaciones.length;

  const realizados = asignaciones.filter(
    (asignacion) => asignacion.estado === "completado",
  ).length;

  const pendientes = total - realizados;

  const porcentaje =
    total > 0 ? Math.round((realizados / total) * 100) : 0;

  const primerNombre =
    paciente.nombre?.trim().split(/\s+/)[0] || "bienvenido/a";

  const completado = total > 0 && realizados === total;

  const mensajeProgreso = errorAsignaciones
    ? "No pudimos cargar tus evaluaciones. Actualizá la página para intentarlo nuevamente."
    : total === 0
      ? "Todavía no tenés evaluaciones asignadas."
      : completado
        ? "¡Excelente! Completaste todas tus evaluaciones."
        : realizados === 0
          ? "Todavía no comenzaste. Podés iniciar tu primera evaluación cuando estés listo/a."
          : "¡Vas muy bien! Podés continuar con las evaluaciones pendientes.";

  return (
    <div className={styles.container}>
      {/* ENCABEZADO */}
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <span className={styles.eyebrow}>
            PORTAL DEL PACIENTE
          </span>

          <h1>
            Hola, {primerNombre}
            <span className={styles.wave} aria-hidden="true">
              👋
            </span>
          </h1>

          <p>
            Bienvenido a tu espacio de evaluación.
            Desde acá podés consultar tu progreso y
            acceder a tus evaluaciones.
          </p>
        </div>

        <div className={styles.headerBadge}>
          <span className={styles.statusDot} />
          Acceso habilitado
        </div>
      </header>

      {/* INDICADORES */}
      <section
        className={styles.statsGrid}
        aria-label="Resumen de evaluaciones"
      >
        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>
              EVALUACIONES ASIGNADAS
            </span>
            <span className={styles.statIcon}>01</span>
          </div>

          <strong className={styles.statValue}>
            {errorAsignaciones ? "—" : total}
          </strong>

          <span className={styles.statDescription}>
            Evaluaciones en tu proceso
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>
              COMPLETADAS
            </span>
            <span className={styles.statIcon}>02</span>
          </div>

          <strong className={styles.statValue}>
            {errorAsignaciones ? "—" : realizados}
          </strong>

          <span className={styles.statDescription}>
            Evaluaciones finalizadas
          </span>
        </article>

        <article className={styles.statCard}>
          <div className={styles.statTop}>
            <span className={styles.statLabel}>
              PENDIENTES
            </span>
            <span className={styles.statIcon}>03</span>
          </div>

          <strong className={styles.statValue}>
            {errorAsignaciones ? "—" : pendientes}
          </strong>

          <span className={styles.statDescription}>
            Evaluaciones por completar
          </span>
        </article>
      </section>

      {/* PROGRESO Y ACCESO */}
      <section className={styles.overviewGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>
                SEGUIMIENTO
              </span>
              <h2>Tu progreso</h2>
            </div>

            <span className={styles.progressPercentage}>
              {errorAsignaciones ? "—" : `${porcentaje}%`}
            </span>
          </div>

          <p className={styles.panelDescription}>
            {errorAsignaciones
              ? "Información no disponible"
              : `${realizados} de ${total} evaluaciones completadas`}
          </p>

          <div
            className={styles.progressTrack}
            role="progressbar"
            aria-label="Progreso de evaluaciones"
            aria-valuenow={porcentaje}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={styles.progressBar}
              style={{ width: `${porcentaje}%` }}
            />
          </div>

          <p className={styles.progressMessage}>
            {mensajeProgreso}
          </p>

          <button
            type="button"
            className={styles.textLink}
            onClick={() => navigate("/app/tests")}
          >
            Ir a mis evaluaciones
            <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeading}>
            <div>
              <span className={styles.eyebrow}>
                VIGENCIA
              </span>
              <h2>Tu acceso</h2>
            </div>

            <span className={styles.accessIndicator}>
              ACTIVO
            </span>
          </div>

          <p className={styles.panelDescription}>
            Tu acceso a la plataforma está disponible hasta:
          </p>

          <div className={styles.accessDeadline}>
            <span className={styles.deadlineLabel}>
              FECHA DE FINALIZACIÓN
            </span>

            <strong className={styles.deadline}>
              {formatearFecha(paciente.fechaFinAcceso)}
            </strong>

            <span className={styles.deadlineTime}>
              Hasta las {formatearHora(paciente.fechaFinAcceso)} hs
            </span>
          </div>

          <p className={styles.accessNote}>
            Te recomendamos completar tus evaluaciones
            antes de que finalice tu período de acceso.
          </p>
        </article>
      </section>

      {/* INDICACIONES */}
      <section className={styles.instructionsSection}>
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>
              INFORMACIÓN IMPORTANTE
            </span>
            <h2>Antes de comenzar</h2>
            <p>
              Seguí estas recomendaciones para realizar
              tus evaluaciones sin inconvenientes.
            </p>
          </div>
        </div>

        <div className={styles.instructionsGrid}>
          <article className={styles.instructionCard}>
            <span className={styles.instructionNumber}>
              01
            </span>

            <div>
              <h3>Sin interrupciones</h3>
              <p>
                Una vez iniciado un test, no podrás
                pausarlo ni cerrar la página hasta
                finalizarlo.
              </p>
            </div>
          </article>

          <article className={styles.instructionCard}>
            <span className={styles.instructionNumber}>
              02
            </span>

            <div>
              <h3>Reservá tu tiempo</h3>
              <p>
                Te recomendamos disponer de al menos
                2 horas de tranquilidad para completar
                el proceso.
              </p>
            </div>
          </article>

          <article className={styles.instructionCard}>
            <span className={styles.instructionNumber}>
              03
            </span>

            <div>
              <h3>Leé con atención</h3>
              <p>
                Algunas evaluaciones tienen tiempo
                límite. Leé cada instrucción antes
                de comenzar.
              </p>
            </div>
          </article>

          <article className={styles.instructionCard}>
            <span className={styles.instructionNumber}>
              04
            </span>

            <div>
              <h3>Validá tu identidad</h3>
              <p>
                Para completar el proceso te
                solicitaremos una foto de tu DNI.
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* ACCIONES */}
      <section className={styles.actionsPanel}>
        <div className={styles.actionsContent}>
          <span className={styles.eyebrow}>
            SIGUIENTE PASO
          </span>

          <h2>¿Todo listo para comenzar?</h2>

          <p>
            Accedé a tus evaluaciones o completá
            la validación de tu identidad.
          </p>
        </div>

        <div className={styles.buttonContainer}>
          <BotonPersonalizado
            variant="primary"
            onClick={() => navigate("/app/tests")}
            disabled={false}
          >
            Ver mis evaluaciones
          </BotonPersonalizado>

          <BotonPersonalizado
            variant="secondary"
            onClick={() => navigate("/app/dni")}
            disabled={false}
          >
            Subir DNI
          </BotonPersonalizado>
        </div>
      </section>
    </div>
  );
}
