
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BFQ_TEST } from "../../../data/tests/BFQ_TEST";

import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestNavigator from "../helpers/TestNavigator/TestNavigator";
import TestNavigationFooter from "../helpers/TestNavigationFooter/TestNavigationFooter";
import TestTimer from "../helpers/TestTimer/TestTimer";

import { useTestEngine } from "../helpers/useTestEngine";

import styles from "./TestBFQ.module.css";

type DimensionesBFQ = {
  extraversion: number;
  amabilidad: number;
  responsabilidad: number;
  neuroticismo: number;
  apertura: number;
};

type ResultadoBFQ = {
  dimensiones: DimensionesBFQ;
  respuestas: number[];
  metodo: string;
  nivel: string;
  score: number;
};

type Props = {
  onFinish: (resultado: ResultadoBFQ) => void | Promise<void>;
  userId: string | number;
};

const TIME_LIMIT_MS = 30 * 60 * 1000;

const DIMENSIONES_MAP = {
  extraversion: [0, 5],
  amabilidad: [2, 3],
  responsabilidad: [4, 6],
  neuroticismo: [8],
  apertura: [1, 7, 9],
};

export default function TestBFQ({
  onFinish,
  userId,
}: Props) {
  const navigate = useNavigate();

  const totalPreguntas = BFQ_TEST.preguntas.length;

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);

  const questionRef = useRef<HTMLHeadingElement>(null);

  const [respuestas, setRespuestas] = useState<number[]>(
    () => Array(totalPreguntas).fill(0)
  );

  const [visitadas, setVisitadas] = useState<boolean[]>(
    () => {
      const iniciales = Array(totalPreguntas).fill(false);

      if (totalPreguntas > 0) {
        iniciales[0] = true;
      }

      return iniciales;
    }
  );

  /* ==========================================
     RESULTADOS
     ========================================== */

  const obtenerResultado = (): ResultadoBFQ => {
    const calcularDimension = (indices: number[]) =>
      indices.reduce(
        (acumulado, index) =>
          acumulado + (respuestas[index] || 0),
        0
      );

    const dimensiones: DimensionesBFQ = {
      extraversion: calcularDimension(
        DIMENSIONES_MAP.extraversion
      ),
      amabilidad: calcularDimension(
        DIMENSIONES_MAP.amabilidad
      ),
      responsabilidad: calcularDimension(
        DIMENSIONES_MAP.responsabilidad
      ),
      neuroticismo: calcularDimension(
        DIMENSIONES_MAP.neuroticismo
      ),
      apertura: calcularDimension(
        DIMENSIONES_MAP.apertura
      ),
    };

    return {
      dimensiones,
      respuestas: [...respuestas],
      metodo: "BFQ",
      nivel: "Perfil Big Five",
      score: Object.values(dimensiones).reduce(
        (total, valor) => total + valor,
        0
      ),
    };
  };

  /* ==========================================
     MOTOR
     ========================================== */

  const engine = useTestEngine({
    userId,
    testId: "bfq",
    timeLimitMs: TIME_LIMIT_MS,

    getResult: () => ({
      ...obtenerResultado(),
      preguntaActual,
      visitadas,
    }),

    onRestore: (data: any) => {
      if (Array.isArray(data.respuestas)) {
        setRespuestas(
          Array.from(
            { length: totalPreguntas },
            (_, index) => {
              const valor = data.respuestas[index];

              return typeof valor === "number" &&
                Number.isFinite(valor) &&
                BFQ_TEST.opciones.some(
                  (opcion) => opcion.valor === valor
                )
                ? valor
                : 0;
            }
          )
        );
      }

      if (Number.isInteger(data.preguntaActual)) {
        setPreguntaActual(
          Math.max(
            0,
            Math.min(
              totalPreguntas - 1,
              data.preguntaActual
            )
          )
        );
      }

      if (Array.isArray(data.visitadas)) {
        setVisitadas(
          Array.from(
            { length: totalPreguntas },
            (_, index) =>
              Boolean(data.visitadas[index])
          )
        );
      }
    },

    onFinish: async (data) => {
      await onFinish(data as ResultadoBFQ);

      navigate("/app/tests", {
        replace: true,
      });
    },
  });

  /* ==========================================
     PROGRESO
     ========================================== */

  const respondidasArray = respuestas.map(
    (respuesta) => respuesta !== 0
  );

  const cantidadRespondidas =
    respondidasArray.filter(Boolean).length;

  const testCompleto =
    totalPreguntas > 0 &&
    cantidadRespondidas === totalPreguntas;

  const respuestaActual =
    respuestas[preguntaActual] ?? 0;

  const pregunta =
    BFQ_TEST.preguntas[preguntaActual];

  /* ==========================================
     RESPONDER
     ========================================== */

  const responder = (
    index: number,
    valor: number
  ) => {
    if (
      engine.inputLocked ||
      enviando ||
      index < 0 ||
      index >= totalPreguntas
    ) {
      return;
    }

    const nuevasRespuestas = [...respuestas];
    nuevasRespuestas[index] = valor;

    setRespuestas(nuevasRespuestas);

    engine.update({
      respuestas: nuevasRespuestas,
    });
  };

  /* ==========================================
     NAVEGACIÓN
     ========================================== */

  const irAPregunta = (index: number) => {
    if (
      engine.inputLocked ||
      enviando ||
      index < 0 ||
      index >= totalPreguntas
    ) {
      return;
    }

    setPreguntaActual(index);

    setVisitadas((anteriores) => {
      if (anteriores[index]) {
        return anteriores;
      }

      const nuevas = [...anteriores];
      nuevas[index] = true;

      return nuevas;
    });
  };

  const irAnterior = () => {
    irAPregunta(preguntaActual - 1);
  };

  const irSiguiente = () => {
    irAPregunta(preguntaActual + 1);
  };

  /* ==========================================
     FINALIZACIÓN
     ========================================== */

  const finalizar = async () => {
    if (
      !engine.started ||
      engine.inputLocked ||
      enviando ||
      !testCompleto
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit(obtenerResultado());
    } catch (error) {
      console.error(
        "Error al finalizar BFQ:",
        error
      );

      setEnviando(false);
    }
  };

  /* ==========================================
     FOCO DE PREGUNTA
     ========================================== */

  useEffect(() => {
    if (!engine.started) {
      return;
    }

    questionRef.current?.focus({
      preventScroll: true,
    });

    const reducirMovimiento =
      window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

    questionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: reducirMovimiento
        ? "auto"
        : "smooth",
    });
  }, [preguntaActual, engine.started]);

  /* ==========================================
     INTRODUCCIÓN
     ========================================== */

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Test BFQ"
        descripcion="Evaluación de rasgos de personalidad"
        duracion="30 minutos"
        canStart={canStart}
        onConsentChange={setCanStart}
        onStart={engine.start}
        instrucciones={[
          {
            titulo: "Lea cada afirmación",
            texto: (
              <p>
                Durante la evaluación se
                presentarán distintas frases
                relacionadas con formas de pensar,
                sentir o actuar.
              </p>
            ),
          },
          {
            titulo: "Seleccione una respuesta",
            texto: (
              <p>
                En cada afirmación, elija la opción
                que mejor describa su forma habitual
                de ser.
              </p>
            ),
          },
          {
            titulo: "Responda con naturalidad",
            texto: (
              <p>
                No existen respuestas correctas o
                incorrectas. Procure responder de
                manera espontánea y sincera.
              </p>
            ),
          },
        ]}
      />
    );
  }

  /* ==========================================
     EVALUACIÓN
     ========================================== */

  return (
    <main className={styles.page}>
      {engine.feedback}

      {engine.CameraComponent && (
        <engine.CameraComponent />
      )}

      {/* ENCABEZADO */}

      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>
            EVALUACIÓN PSICOLÓGICA
          </span>

          <h1>
            Escala de Personalidad BFQ
          </h1>

          <p>
            Seleccione la opción que mejor describa
            su forma habitual de pensar, sentir o
            actuar.
          </p>
        </div>

        <TestTimer
          minutes={engine.minutes}
          seconds={engine.seconds}
        />
      </header>

      {/* REGISTRO SUPERIOR */}

      <TestNavigator
        total={totalPreguntas}
        actual={preguntaActual}
        respondidas={respondidasArray}
        visitadas={visitadas}
        onSelect={irAPregunta}
        disabled={engine.inputLocked || enviando}
        itemLabel="Pregunta"
        descripcion="Seleccioná una pregunta para revisar o modificar su respuesta."
      />

      {/* PREGUNTA ACTUAL */}

      <section className={styles.content}>
        <article
          className={styles.questionCard}
          id={`test-item-${preguntaActual}`}
        >
          <div className={styles.questionHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                PREGUNTA{" "}
                {String(preguntaActual + 1).padStart(
                  2,
                  "0"
                )}
                {" "}DE{" "}
                {String(totalPreguntas).padStart(
                  2,
                  "0"
                )}
              </span>

              <h2>
                ¿Qué tanto te representa?
              </h2>

              <p>
                Leé la afirmación y elegí la opción
                que mejor describa tu forma habitual
                de ser.
              </p>
            </div>

            <span
              className={`${styles.status} ${
                respuestaActual !== 0
                  ? styles.statusCompleted
                  : styles.statusPending
              }`}
            >
              {respuestaActual !== 0
                ? "✓ Respondida"
                : "Pendiente"}
            </span>
          </div>

          {/* AFIRMACIÓN */}

          <div className={styles.statementSection}>
            <span className={styles.sectionEyebrow}>
              AFIRMACIÓN
            </span>

            <h3
              id="bfq-question"
              ref={questionRef}
              tabIndex={-1}
              className={styles.question}
            >
              {pregunta}
            </h3>
          </div>

          {/* OPCIONES */}

          <fieldset
            className={styles.answerArea}
            disabled={engine.inputLocked || enviando}
          >
            <legend className={styles.visuallyHidden}>
              Respuesta de la pregunta{" "}
              {preguntaActual + 1}
            </legend>

            <div className={styles.answerHeader}>
              <div>
                <span className={styles.sectionEyebrow}>
                  TU RESPUESTA
                </span>

                <h3>
                  Seleccioná una opción
                </h3>

                <p>
                  No hay respuestas correctas ni
                  incorrectas.
                </p>
              </div>

              {respuestaActual !== 0 && (
                <span className={styles.selectedBadge}>
                  Respuesta seleccionada
                </span>
              )}
            </div>

            <div className={styles.options}>
              {BFQ_TEST.opciones.map((opcion) => {
                const seleccionada =
                  respuestaActual === opcion.valor;

                return (
                  <label
                    key={opcion.valor}
                    className={`${styles.option} ${
                      seleccionada
                        ? styles.optionSelected
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`bfq-${preguntaActual}`}
                      value={opcion.valor}
                      checked={seleccionada}
                      onChange={() =>
                        responder(
                          preguntaActual,
                          opcion.valor
                        )
                      }
                    />

                    <span
                      className={styles.radioVisual}
                      aria-hidden="true"
                    >
                      <span />
                    </span>

                    <span className={styles.optionLabel}>
                      {opcion.label}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className={styles.answerFooter}>
              <span>
                Pregunta {preguntaActual + 1} de{" "}
                {totalPreguntas}
              </span>

              <span
                className={
                  respuestaActual !== 0
                    ? styles.answeredText
                    : styles.pendingText
                }
              >
                {respuestaActual !== 0
                  ? "✓ Respuesta registrada"
                  : "Seleccioná una respuesta"}
              </span>
            </div>
          </fieldset>
        </article>

        {/* FOOTER COMPARTIDO */}

        <TestNavigationFooter
          actual={preguntaActual}
          total={totalPreguntas}
          respondidas={cantidadRespondidas}
          totalRespuestas={totalPreguntas}
          onPrevious={irAnterior}
          onNext={irSiguiente}
          onFinish={finalizar}
          disabled={engine.inputLocked}
          enviando={enviando}
          itemLabel="Pregunta"
          descripcion="Respondé todas las afirmaciones antes de finalizar la evaluación."
          detalleProgreso={`${cantidadRespondidas} de ${totalPreguntas} preguntas respondidas`}
        />

        {!testCompleto && (
          <p
            className={styles.helper}
            role="status"
          >
            {respuestaActual === 0
              ? "Seleccioná una opción para continuar. No hay respuestas correctas o incorrectas."
              : "Podés volver a cualquier pregunta para revisar o modificar tu respuesta."}
          </p>
        )}
      </section>
    </main>
  );
}
