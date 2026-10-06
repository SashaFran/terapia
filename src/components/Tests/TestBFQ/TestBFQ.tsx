import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { BFQ_TEST } from "../../../data/tests/BFQ_TEST";

import BotonPersonalizado from "../../Boton/Boton";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";

import styles from "./TestBFQ.module.css";

import { useTestEngine } from "../helpers/useTestEngine";

type ResultadoBFQ = {
  dimensiones: {
    extraversion: number;
    amabilidad: number;
    responsabilidad: number;
    neuroticismo: number;
    apertura: number;
  };
  respuestas: number[];
  metodo: string;
  tiempoTotalMs: number;
};

type Props = {
  onFinish: (resultado: ResultadoBFQ) => void | Promise<void>;
  userId: string | number;
};

export default function TestBFQ({
  onFinish,
  userId,
}: Props) {
  const navigate = useNavigate();

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [preguntaActual, setPreguntaActual] = useState(0);
  const questionRef = useRef<HTMLHeadingElement>(null);

  const [respuestas, setRespuestas] = useState<number[]>(
    Array(BFQ_TEST.preguntas.length).fill(0),
  );
  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(BFQ_TEST.preguntas.length).fill(false);
    iniciales[0] = true;
    return iniciales;
  });

  const totalPreguntas = BFQ_TEST.preguntas.length;

  /* =======================================================
     TEST ENGINE
  ======================================================= */

  const engine = useTestEngine({
    userId,

    testId: "bfq",

    timeLimitMs: 30 * 60 * 1000,

    getResult: () => obtenerResultado(),

    onFinish: async (data) => {
      await onFinish(data);

      navigate("/app/tests", {
        replace: true,
      });
    },
  });

  /* =======================================================
     RESULTADOS
  ======================================================= */

  const dimensionesMap = {
    extraversion: [0, 5],
    amabilidad: [2, 3],
    responsabilidad: [4, 6],
    neuroticismo: [8],
    apertura: [1, 7, 9],
  };

  const calcularDimension = (indices: number[]) =>
    indices.reduce(
      (acc, i) => acc + (respuestas[i] || 0),
      0,
    );

  const obtenerResultado = () => {
    const resultado = {
      extraversion: calcularDimension(
        dimensionesMap.extraversion,
      ),

      amabilidad: calcularDimension(
        dimensionesMap.amabilidad,
      ),

      responsabilidad: calcularDimension(
        dimensionesMap.responsabilidad,
      ),

      neuroticismo: calcularDimension(
        dimensionesMap.neuroticismo,
      ),

      apertura: calcularDimension(
        dimensionesMap.apertura,
      ),
    };

    return {
      dimensiones: resultado,
      respuestas,
      metodo: "BFQ",
      nivel: "Perfil Big Five",

      score: Object.values(resultado).reduce(
        (acc, val) => acc + val,
        0,
      ),
    };
  };

  /* =======================================================
     RESPONDER
  ======================================================= */

  const responder = (
    index: number,
    valor: number,
  ) => {
    setRespuestas((prev) => {
      const copia = [...prev];

      copia[index] = valor;

      return copia;
    });
  };

  /* =======================================================
     NAVEGACIÓN
  ======================================================= */

  const irAnterior = () => {
    if (preguntaActual === 0) return;

    setPreguntaActual((prev) => prev - 1);
  };

  const irSiguiente = () => {
    if (preguntaActual >= totalPreguntas - 1) {
      return;
    }

    irAPregunta(preguntaActual + 1);
  };

  const irAPregunta = (index: number) => {
    if (engine.inputLocked) return;

    setPreguntaActual(index);
    setVisitadas((prev) => {
      if (prev[index]) return prev;
      const copia = [...prev];
      copia[index] = true;
      return copia;
    });
  };

  /* =======================================================
     FINALIZAR
  ======================================================= */

  const incompleto = respuestas.some(
    (respuesta) => respuesta === 0,
  );

  const calcularResultado = async () => {
    if (
      !engine.started ||
      enviando ||
      incompleto
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit(
        obtenerResultado(),
      );
    } catch (error) {
      console.error(
        "Error al finalizar:",
        error,
      );

      setEnviando(false);
    }
  };

  /* =======================================================
     SCROLL AL CAMBIAR DE PREGUNTA
  ======================================================= */

  useEffect(() => {
    if (!engine.started) return;

    questionRef.current?.focus({ preventScroll: true });
    questionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [preguntaActual, engine.started]);

  /* =======================================================
     INTRODUCCIÓN
  ======================================================= */

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

  /* =======================================================
     DATOS DE LA PREGUNTA ACTUAL
  ======================================================= */

  const pregunta =
    BFQ_TEST.preguntas[preguntaActual];

  const respuestaActual =
    respuestas[preguntaActual];

  const respondidas =
    respuestas.filter(
      (respuesta) => respuesta !== 0,
    ).length;

  const porcentaje =
    (respondidas / totalPreguntas) * 100;

  const esPrimera =
    preguntaActual === 0;

  const esUltima =
    preguntaActual ===
    totalPreguntas - 1;

  /* =======================================================
     TEST
  ======================================================= */

  return (
    <main className={styles.page}>
      {engine.feedback}

      {engine.CameraComponent && (
        <engine.CameraComponent />
      )}

      {/* ===================================================
          CABECERA
      =================================================== */}

      <header className={styles.header}>
        <div className={styles.headerCopy}>
          <p className={styles.eyebrow}>
            Evaluación en curso
          </p>

          <h1>
            Escala de Personalidad BFQ
          </h1>

          <p className={styles.subtitle}>
            Seleccione la opción que mejor describa
            su forma habitual de pensar, sentir o
            actuar.
          </p>
        </div>

        <div className={styles.timer}>
          <span>Tiempo restante</span>

          <strong>
            {engine.minutes}:
            {String(
              engine.seconds,
            ).padStart(2, "0")}
          </strong>
        </div>
      </header>

      {/* ===================================================
          PROGRESO GENERAL
      =================================================== */}

      <section className={styles.progressSection}>
        <div className={styles.progressMeta}>
          <span>
            Pregunta {preguntaActual + 1} de{" "}
            {totalPreguntas}
          </span>

          <span>
            {respondidas} respondidas
          </span>
        </div>

        <div
          className={styles.progressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={totalPreguntas}
          aria-valuenow={respondidas}
          aria-label={`${respondidas} de ${totalPreguntas} preguntas respondidas`}
        >
          <div
            className={styles.progressFill}
            style={{
              width: `${porcentaje}%`,
            }}
          />
        </div>
      </section>

      {/* ===================================================
          LAYOUT PRINCIPAL
      =================================================== */}

      <div className={styles.testLayout}>
        {/* =================================================
            NAVEGADOR DE PREGUNTAS
        ================================================= */}

        <aside className={styles.questionNavigator}>
          <div className={styles.navigatorHeader}>
            <div>
              <p>Evaluación</p>

              <h2>Preguntas</h2>
            </div>

            <span className={styles.navigatorCount}>
              {respondidas}/{totalPreguntas}
            </span>
          </div>

          <div className={styles.navigatorProgress}>
            <div
              style={{
                width: `${porcentaje}%`,
              }}
            />
          </div>

          <p className={styles.navigatorStatus}>
            {respondidas} de {totalPreguntas} respondidas
          </p>

          {/* ===============================================
              NÚMEROS
          =============================================== */}

<div className={styles.questionGrid}>
  {respuestas.map((r, i) => (
    <button
      key={i}
      type="button"
      disabled={engine.inputLocked}
      onClick={() => irAPregunta(i)}
      aria-current={i === preguntaActual ? "step" : undefined}
      aria-label={`Pregunta ${i + 1}, ${r ? "respondida" : visitadas[i] ? "sin responder" : "pendiente"}`}
    >
      {i + 1}
    </button>
  ))}
</div>

          {/* ===============================================
              LEYENDA
          =============================================== */}

          <div className={styles.navigatorLegend}>
            <span>
              <i
                className={
                  styles.legendAnswered
                }
              />

              Respondida
            </span>

            <span>
              <i
                className={
                  styles.legendCurrent
                }
              />

              Actual
            </span>
          </div>
        </aside>

        {/* =================================================
            PREGUNTA ACTUAL
        ================================================= */}

        <section className={styles.questionArea}>
          <div className={styles.questionCard}>
            <div className={styles.questionHeader}>
              <span className={styles.questionNumber}>
                Pregunta{" "}
                {String(
                  preguntaActual + 1,
                ).padStart(2, "0")}
              </span>

              {respuestaActual !== 0 && (
                <span className={styles.answered}>
                  <span />

                  Respondida
                </span>
              )}
            </div>

            <h2 id="bfq-question" ref={questionRef} tabIndex={-1} className={styles.question}>
              {pregunta}
            </h2>

            {/* =============================================
                OPCIONES
            ============================================= */}

            <div
              className={styles.options}
              role="radiogroup"
              aria-labelledby="bfq-question"
            >
              {BFQ_TEST.opciones.map(
                (op) => {
                  const seleccionada =
                    respuestaActual ===
                    op.valor;

                  return (
                    <label
                      key={op.valor}
                      className={`${
                        styles.option
                      } ${
                        seleccionada
                          ? styles.optionSelected
                          : ""
                      }`}
                    >
                      <input
                        type="radio"
                        name={`pregunta-${preguntaActual}`}
                        value={op.valor}
                        checked={
                          seleccionada
                        }
                        disabled={
                          engine.inputLocked
                        }
                        onChange={() =>
                          responder(
                            preguntaActual,
                            op.valor,
                          )
                        }
                      />

                      <span
                        className={
                          styles.radioVisual
                        }
                        aria-hidden="true"
                      >
                        <span />
                      </span>

                      <span
                        className={
                          styles.optionLabel
                        }
                      >
                        {op.label}
                      </span>
                    </label>
                  );
                },
              )}
            </div>
          </div>

          {/* ===============================================
              NAVEGACIÓN INFERIOR
          =============================================== */}

          <div className={styles.navigation}>
            <button
              type="button"
              className={styles.backButton}
              onClick={irAnterior}
              disabled={
                esPrimera ||
                engine.inputLocked
              }
            >
              <span aria-hidden="true">
                ←
              </span>

              Anterior
            </button>

            <div className={styles.navigationStatus}>
              <span>
                {preguntaActual + 1}
              </span>

              <span>/</span>

              <span>
                {totalPreguntas}
              </span>
            </div>

            {!esUltima ? (
              <button
                type="button"
                className={styles.nextButton}
                onClick={irSiguiente}
                disabled={
                  engine.inputLocked
                }
              >
                Siguiente

                <span aria-hidden="true">
                  →
                </span>
              </button>
            ) : (
              <div
                className={
                  styles.finishButton
                }
              >
                <BotonPersonalizado
                  variant="primary"
                  disabled={
                    incompleto ||
                    enviando ||
                    engine.inputLocked
                  }
                  onClick={
                    calcularResultado
                  }
                >
                  {enviando
                    ? "Guardando..."
                    : "Finalizar evaluación"}
                </BotonPersonalizado>
              </div>
            )}
          </div>

          <p className={styles.helper}>
            {esUltima && incompleto
              ? `Faltan ${totalPreguntas - respondidas} preguntas por responder. Seleccione una pregunta pendiente en el navegador para completarla.`
              : respuestaActual === 0
                ? "Seleccione una opción para continuar. No hay respuestas correctas o incorrectas."
                : "Puede volver a cualquier pregunta para revisar o cambiar su respuesta antes de finalizar."}
          </p>
        </section>
      </div>
    </main>
  );
}
