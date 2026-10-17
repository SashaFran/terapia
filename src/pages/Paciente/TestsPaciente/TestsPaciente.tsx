
import { logoutPatient } from "../../../utils/patientAccess";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { db } from "../../../firebase/firebase";

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
  zulliger:
    "Evaluación mediante láminas e interpretación de respuestas.",
  bender: "Evaluación de integración visomotora.",
  raven:
    "Evaluación de razonamiento y capacidad de resolución.",
};

/* =====================================================
   FECHAS Y CONTADOR DE ACCESO
   ===================================================== */

const convertirFecha = (fecha: any): Date | null => {
  if (!fecha) return null;

  let resultado: Date;

  if (typeof fecha.toDate === "function") {
    resultado = fecha.toDate();
  } else if (typeof fecha.seconds === "number") {
    resultado = new Date(fecha.seconds * 1000);
  } else {
    resultado = new Date(fecha);
  }

  return Number.isNaN(resultado.getTime())
    ? null
    : resultado;
};

const calcularTiempoRestante = (
  fechaFinAcceso: any,
  ahora: number
): string => {
  const fechaFin = convertirFecha(fechaFinAcceso);

  if (!fechaFin) {
    return "-- hs -- min";
  }

  const diferencia = fechaFin.getTime() - ahora;

  if (diferencia <= 0) {
    return "00 hs 00 min";
  }

  const minutosTotales = Math.ceil(
    diferencia / (1000 * 60)
  );

  const horas = Math.floor(minutosTotales / 60);
  const minutos = minutosTotales % 60;

  return `${String(horas).padStart(2, "0")} hs ${String(
    minutos
  ).padStart(2, "0")} min`;
};

/* =====================================================
   COMPONENTE
   ===================================================== */

export default function TestsPaciente() {
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<any>(null);

  const [tests, setTests] = useState<Test[]>([]);

  const [loading, setLoading] = useState(true);

  const [ahora, setAhora] = useState(() => Date.now());

  /* =====================================================
     CONTADOR AUTOMÁTICO
     ===================================================== */

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      setAhora(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalo);
  }, []);

  const tiempoRestante = calcularTiempoRestante(
    paciente?.fechaFinAcceso,
    ahora
  );

  const accesoVencido = (() => {
    const fechaFin = convertirFecha(
      paciente?.fechaFinAcceso
    );

    return fechaFin
      ? ahora >= fechaFin.getTime()
      : false;
  })();

  /* =====================================================
     PROGRESO
     ===================================================== */

  const calcularProgreso = (listaTests: Test[]) => {
    const total = listaTests.length;

    const realizados = listaTests.filter(
      (test) => test.estado === "completado"
    ).length;

    const porcentaje =
      total > 0
        ? Math.round((realizados / total) * 100)
        : 0;

    return {
      realizados,
      total,
      porcentaje,
    };
  };

  const { realizados, total, porcentaje } =
    calcularProgreso(tests);

  const dniCargado = !!paciente?.archivodni;

  /* =====================================================
     INFORMACIÓN DE TESTS
     ===================================================== */

  const obtenerNombreTest = (testId?: string) => {
    if (!testId) {
      return "Evaluación";
    }

    return NOMBRES_TESTS[testId] || testId.toUpperCase();
  };

  const obtenerDescripcionTest = (testId?: string) => {
    if (!testId) {
      return "Evaluación psicológica asignada.";
    }

    return (
      DESCRIPCIONES_TESTS[testId] ||
      "Evaluación psicológica asignada."
    );
  };

  const obtenerEstado = (estado: string) => {
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
        return {
          texto: "En curso",
          clase: styles.pending,
        };

      default:
        return {
          texto: "Pendiente",
          clase: styles.pending,
        };
    }
  };

  /* =====================================================
     CARGA DEL PACIENTE Y EVALUACIONES
     ===================================================== */

  useEffect(() => {
    const data = localStorage.getItem("paciente");

    if (!data) {
      navigate("/login");
      return;
    }

    let patient;

    try {
      patient = JSON.parse(data);
    } catch {
      navigate("/login");
      return;
    }

    setPaciente(patient);

    const assignments = query(
      collection(db, "asignaciones"),
      where("pacienteId", "==", patient.id)
    );

    return onSnapshot(
      assignments,
      (snap) => {
        setTests(
          snap.docs.map((documento) => ({
            id: documento.id,
            ...documento.data(),
          })) as Test[]
        );

        setLoading(false);
      },
      (error) => {
        console.error(
          "Error cargando evaluaciones:",
          error
        );

        setLoading(false);
      }
    );
  }, [navigate]);

  /* =====================================================
     CERRAR SESIÓN
     ===================================================== */

  const cerrarSesion = async () => {
    if (
      !window.confirm(
        "Al cerrar sesión su cuenta quedará inhabilitada y no podrá volver a ingresar. ¿Desea continuar?"
      )
    ) {
      return;
    }

    try {
      await logoutPatient();
    } finally {
      navigate("/login", { replace: true });
    }
  };

  /* =====================================================
     LOADING
     ===================================================== */

  if (loading) {
    return (
      <LoadingState  />
    );
  }

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className={styles.container}>
      {/* ENCABEZADO */}

      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>
            EVALUACIONES
          </span>

          <h1>Mis evaluaciones</h1>

          <p>
            Completá las evaluaciones asignadas dentro
            del período habilitado.
          </p>
        </div>

        {/* CONTADOR DE ACCESO */}

        <div className={styles.deadline}>
          <span>
            {accesoVencido
              ? "Acceso finalizado"
              : "Tiempo de acceso restante"}
          </span>

          <strong
            className={styles.deadlineCountdown}
          >
            {tiempoRestante}
          </strong>
        </div>
      </header>

      {/* PROGRESO */}

      <section className={styles.progressCard}>
        <div className={styles.progressTop}>
          <div>
            <span>Tu progreso</span>

            <strong>
              {realizados} de {total} completadas
            </strong>
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
      </section>

      {/* DNI PENDIENTE */}

      {!dniCargado && realizados < total && (
        <section className={styles.identityNotice}>
          <div>
            <span className={styles.noticeLabel}>
              PASO PREVIO
            </span>

            <h2>Validá tu identidad</h2>

            <p>
              Antes de comenzar las evaluaciones
              necesitamos que cargues una imagen
              de tu DNI.
            </p>
          </div>

          <BotonPersonalizado
            variant="primary"
            onClick={() => navigate("/app/dni")}
            disabled={false}
          >
            Subir DNI
          </BotonPersonalizado>
        </section>
      )}

      {/* LISTA DE EVALUACIONES */}

      <section className={styles.evaluations}>
        <div className={styles.sectionHeader}>
          <div>
            <h2>Evaluaciones asignadas</h2>

            <p>
              Seleccioná una evaluación para ver
              sus instrucciones y comenzar.
            </p>
          </div>

          <span className={styles.testCount}>
            {total}{" "}
            {total === 1
              ? "evaluación"
              : "evaluaciones"}
          </span>
        </div>

        <div className={styles.testList}>
          {tests.map((test, index) => {
            const estado = obtenerEstado(
              test.estado
            );

            const bloqueado =
              !dniCargado &&
              test.estado !== "completado";

            return (
              <article
                key={test.id}
                className={`${styles.testCard} ${
                  bloqueado ? styles.locked : ""
                }`}
              >
                <div className={styles.testNumber}>
                  {String(index + 1).padStart(
                    2,
                    "0"
                  )}
                </div>

                <div className={styles.testContent}>
                  <div className={styles.testTitle}>
                    <h3>
                      {obtenerNombreTest(
                        test.testId
                      )}
                    </h3>

                    <span
                      className={`${styles.status} ${estado.clase}`}
                    >
                      {estado.texto}
                    </span>
                  </div>

                  <p>
                    {obtenerDescripcionTest(
                      test.testId
                    )}
                  </p>
                </div>

                <div className={styles.testAction}>
                  {test.estado ===
                  "completado" ? (
                    <span
                      className={styles.doneText}
                    >
                      Finalizado
                    </span>
                  ) : test.estado ===
                    "abandono" ? (
                    <span
                      className={styles.blockedText}
                    >
                      No disponible
                    </span>
                  ) : test.estado ===
                    "en_curso" ? (
                    <span
                      className={styles.blockedText}
                    >
                      Registrando salida…
                    </span>
                  ) : accesoVencido ? (
                    <span
                      className={styles.blockedText}
                    >
                      Acceso vencido
                    </span>
                  ) : bloqueado ? (
                    <span
                      className={styles.lockedText}
                    >
                      Requiere DNI
                    </span>
                  ) : (
                    <BotonPersonalizado
                      variant="primary"
                      tooltip="Ver las instrucciones e iniciar esta evaluación."
                      onClick={() =>
                        navigate(
                          `/app/test/${test.testId}`
                        )
                      }
                      disabled={false}
                    >
                      Comenzar
                    </BotonPersonalizado>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* TODO COMPLETADO */}

      {total > 0 && realizados === total && (
        <section className={styles.completedCard}>
          <div>
            <span className={styles.completedLabel}>
              PROCESO COMPLETADO
            </span>

            <h2>
              Finalizaste todas tus evaluaciones
            </h2>

            <p>
              Tus respuestas fueron registradas
              correctamente. Ya podés cerrar
              tu sesión.
            </p>
          </div>

          <BotonPersonalizado
            variant="secondary"
            onClick={cerrarSesion}
            disabled={false}
          >
            Cerrar sesión
          </BotonPersonalizado>
        </section>
      )}
    </div>
  );
}
