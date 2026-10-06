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

export default function DashboardPaciente() {
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<any>(null);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [loadingAsignaciones, setLoadingAsignaciones] = useState(true);

  const calcularProgreso = (items: Asignacion[]) => {
    if (!items || items.length === 0) {
      return {
        realizados: 0,
        total: 0,
        porcentaje: 0,
      };
    }

    const total = items.length;

    const realizados = items.filter(
      (asignacion) => asignacion.estado === "completado",
    ).length;

    const porcentaje = Math.round(
      (realizados / total) * 100,
    );

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
  } = calcularProgreso(asignaciones);

  useEffect(() => {
    const data = localStorage.getItem("paciente");

    if (!data) {
      navigate("/login");
      return;
    }

    const parsed = JSON.parse(data);

    const ahora = new Date();

    const fin = parsed.fechaFinAcceso?.seconds
      ? new Date(
          parsed.fechaFinAcceso.seconds * 1000,
        )
      : null;

    if (!fin || ahora >= fin) {
      localStorage.removeItem("paciente");
      localStorage.removeItem("pacienteId");
      localStorage.removeItem("rol");

      navigate("/login");
      return;
    }

    setPaciente(parsed);
  }, [navigate]);

  useEffect(() => {
    const cargarAsignaciones = async () => {
      if (!paciente?.id) {
        setLoadingAsignaciones(false);
        return;
      }

      setLoadingAsignaciones(true);

      try {
        const q = query(
          collection(db, "asignaciones"),
          where(
            "pacienteId",
            "==",
            paciente.id,
          ),
        );

        const snap = await getDocs(q);

        const asignacionesData =
          snap.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })) as Asignacion[];

        setAsignaciones(asignacionesData);
      } catch (error) {
        console.error(
          "Error cargando asignaciones:",
          error,
        );
      } finally {
        setLoadingAsignaciones(false);
      }
    };

    void cargarAsignaciones();
  }, [paciente]);

  const convertirFecha = (fecha: any): Date | null => {
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
  };

  const formatearFechaLimite = (fecha: any) => {
    const date = convertirFecha(fecha);

    if (!date) return "—";

    return date
      .toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
      .replace(".", "")
      .toUpperCase();
  };

  const formatearHoraLimite = (fecha: any) => {
    const date = convertirFecha(fecha);

    if (!date) return "";

    return date.toLocaleTimeString("es-AR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatearDni = (dni: string) => {
    if (!dni) return "—";

    return new Intl.NumberFormat("es-AR").format(
      Number(dni),
    );
  };

  const primerNombre =
    paciente?.nombre?.trim().split(" ")[0] || "";

  if (!paciente) {
    return <LoadingState message="Cargando tu información..." />;
  }

  if (loadingAsignaciones) {
    return <LoadingState message="Cargando tus evaluaciones..." />;
  }

  return (
    <div className={`${styles.container} scrollbar padding`}>
      {/* BIENVENIDA */}
      <section className={styles.welcome}>
        <span className={styles.eyebrow}>
          JOIN SOLUTION
        </span>

        <h1>
          Hola, {primerNombre}
          <span className={styles.wave}>👋</span>
        </h1>

        <p>
          Todo está listo para comenzar tu proceso de
          evaluación.
        </p>
      </section>

      {/* RESUMEN PRINCIPAL */}
      <section className={styles.summaryCard}>
        <div className={styles.accessInfo}>
          <span className={styles.sectionLabel}>
            TU ACCESO
          </span>

          
    <div className={styles.accessInfo}>
      <p className={styles.accessSubtitle}>
            Disponible hasta
          </p>
          <div className={styles.deadline}>
            {formatearFechaLimite(
              paciente.fechaFinAcceso,
            )}
          </div>

          <p className={styles.deadlineTime}>
            {formatearHoraLimite(
              paciente.fechaFinAcceso,
            )}{" "}
            hs
          </p>
          </div> </div>
        <div className={styles.divider} />

        <div className={styles.progressInfo}>
          <div className={styles.progressHeader}>
            <div>
              <span className={styles.sectionLabel}>
                TU PROGRESO
              </span>

              <h2>
                {realizados} de {total}
              </h2>

              <p>
                evaluaciones completadas
              </p>
            </div>

            <span className={styles.percentage}>
              {porcentaje}%
            </span>
          </div>

          <div className={styles.progressTrack}>
            <div
              className={styles.progressBar}
              style={{
                width: `${porcentaje}%`,
              }}
            />
          </div>

          <p className={styles.progressMessage}>
            {realizados === 0
              ? "Todavía no comenzaste. Cuando estés listo/a, podés iniciar tu primera evaluación."
              : realizados === total
                ? "Completaste todas las evaluaciones asignadas."
                : "Muy bien. Podés continuar con las evaluaciones que quedan pendientes."}
          </p>
        </div>
      </section>

      {/* INSTRUCCIONES */}
      <section className={styles.instructions}>
        <div className={styles.instructionsHeader}>
          <span className={styles.eyebrow}>
            INFORMACIÓN IMPORTANTE
          </span>

          <h2>Antes de comenzar</h2>

          <p>
            Tené en cuenta estas indicaciones para
            realizar tus evaluaciones sin inconvenientes.
          </p>
        </div>

        <div className={styles.instructionsGrid}>
          <article className={styles.instruction}>
            <div className={styles.icon}>
              01
            </div>

            <div>
              <h3>Sin interrupciones</h3>

              <p>
                Una vez iniciado un test, no podrás
                pausarlo ni cerrar la página hasta
                finalizarlo.
              </p>
            </div>
          </article>

          <article className={styles.instruction}>
            <div className={styles.icon}>
              02
            </div>

            <div>
              <h3>Reservá tu tiempo</h3>

              <p>
                Te recomendamos disponer de al menos
                2 horas de tranquilidad para completar
                el proceso.
              </p>
            </div>
          </article>

          <article className={styles.instruction}>
            <div className={styles.icon}>
              03
            </div>

            <div>
              <h3>Leé con atención</h3>

              <p>
                Algunas evaluaciones tienen tiempo
                límite. Leé cada instrucción antes de
                comenzar.
              </p>
            </div>
          </article>

          <article className={styles.instruction}>
            <div className={styles.icon}>
              04
            </div>

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
      <section className={styles.actions}>
        <div className={styles.actionsText}>
          <h2>¿Todo listo?</h2>

          <p>
            Podés comenzar cuando tengas el tiempo
            necesario para completar las evaluaciones
            con tranquilidad.
          </p>
        </div>

        <div className={styles.buttonContainer}>
          <BotonPersonalizado
            variant="primary"
            onClick={() =>
              navigate("/app/tests")
            }
            disabled={false}
          >
            Ver mis evaluaciones
          </BotonPersonalizado>

          <BotonPersonalizado
            variant="secondary"
            onClick={() =>
              navigate("/app/dni")
            }
            disabled={false}
          >
            Subir DNI
          </BotonPersonalizado>
        </div>
      </section>
    </div>
  );
}