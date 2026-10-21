import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestNavigator from "../helpers/TestNavigator/TestNavigator";
import TestNavigationFooter from "../helpers/TestNavigationFooter/TestNavigationFooter";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./Testk10.module.css";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type ResultadoK10 = {
  score: number;
  nivel: string;
  respuestas: number[];
  metodo: string;
};

type Props = {
  onFinish?: (resultado: ResultadoK10) => void | Promise<void>;
  userId?: string | number;
};

export default function TestK10({ onFinish, userId }: Props) {
  const navigate = useNavigate();

  const totalPreguntas = K10_TEST.preguntas.length;

  const [preguntaActual, setPreguntaActual] = useState(0);

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [respuestas, setRespuestas] = useState<number[]>(() =>
    Array(totalPreguntas).fill(0),
  );

  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(totalPreguntas).fill(false);
    iniciales[0] = true;
    return iniciales;
  });

  const questionRef = useRef<HTMLHeadingElement>(null);

  const pacienteStorage = localStorage.getItem("paciente");

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


  let paciente: any = null;

  try {
    paciente = pacienteStorage ? JSON.parse(pacienteStorage) : null;
  } catch {
    paciente = null;
  }

  const resolvedUserId =
    userId ?? paciente?.id ?? localStorage.getItem("pacienteId");

  const obtenerResultado = (): ResultadoK10 => {
    const total = respuestas.reduce((acumulado, valor) => acumulado + valor, 0);

    let nivel = "";

    if (total <= 12) {
      nivel = "Malestar psicológico bajo o moderado";
    } else if (total <= 19) {
      nivel = "Malestar psicológico moderado a severo";
    } else if (total <= 29) {
      nivel = "Malestar psicológico severo";
    } else {
      nivel = "Malestar psicológico muy severo";
    }

    return {
      score: total,
      nivel,
      respuestas,
      metodo: "K10",
    };
  };

  const engine = useTestEngine({
    userId: resolvedUserId,
    testId: "k10",
    timeLimitMs: 30 * 60 * 1000,

    getResult: () => ({
      ...obtenerResultado(),
      preguntaActual,
      visitadas,
    }),

    onRestore: (data: any) => {
      if (Array.isArray(data.respuestas)) {
        setRespuestas(
          Array.from({ length: totalPreguntas }, (_, i) =>
            typeof data.respuestas[i] === "number" ? data.respuestas[i] : 0,
          ),
        );
      }

      if (Number.isInteger(data.preguntaActual)) {
        setPreguntaActual(
          Math.max(0, Math.min(totalPreguntas - 1, data.preguntaActual)),
        );
      }

      if (Array.isArray(data.visitadas)) {
        setVisitadas(
          Array.from({ length: totalPreguntas }, (_, i) =>
            Boolean(data.visitadas[i]),
          ),
        );
      }
    },

    onFinish: async (data) => {
      if (onFinish) {
        await onFinish(data);
      }

      navigate("/app/dashboard", {
        replace: true,
      });
    },
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;

  let timerClass = relojStyle.timer;

  if (tiempoRestante < 60) {
    timerClass += ` ${relojStyle.danger}`;
  } else if (tiempoRestante < 300) {
    timerClass += ` ${relojStyle.warning}`;
  }

  const responder = (index: number, valor: number) => {
    if (engine.inputLocked) return;

    setRespuestas((anteriores) => {
      const nuevas = [...anteriores];
      nuevas[index] = valor;
      return nuevas;
    });
  };

  const irAPregunta = (index: number) => {
    if (engine.inputLocked || index < 0 || index >= totalPreguntas) {
      return;
    }

    setPreguntaActual(index);

    setVisitadas((anteriores) => {
      if (anteriores[index]) return anteriores;

      const nuevas = [...anteriores];
      nuevas[index] = true;
      return nuevas;
    });
  };

  const calcularResultado = async () => {
    if (
      !engine.started ||
      enviando ||
      engine.inputLocked ||
      respuestas.some((respuesta) => respuesta === 0)
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit(obtenerResultado());
    } catch (error) {
      console.error("Error al guardar el K10:", error);

      setEnviando(false);
    }
  };

  const respondidas = respuestas.filter((respuesta) => respuesta !== 0).length;
  useEffect(() => {
    if (!engine.started) return;

    questionRef.current?.focus({
      preventScroll: true,
    });

    questionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  }, [preguntaActual, engine.started]);

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Cuestionario K10"
        descripcion="Cómo se ha sentido en los últimos 30 días"
        canStart={canStart}
        onConsentChange={setCanStart}
        onStart={engine.start}
        startDisabled={!resolvedUserId}
        instrucciones={[
          {
            titulo: "Piense en el último mes",
            texto: (
              <p>
                Este cuestionario contiene 10 preguntas. Responda según cómo se
                ha sentido durante los últimos 30 días.
              </p>
            ),
          },
          {
            titulo: "Seleccione una respuesta",
            texto: (
              <p>
                Elija la frecuencia que mejor describa su experiencia. Puede
                volver a las preguntas anteriores para revisar sus respuestas.
              </p>
            ),
          },
        ]}
      />
    );
  }

  return (
    <main className={styles.page}>
      {engine.feedback}

      {engine.CameraComponent && <engine.CameraComponent />}

      {/* ENCABEZADO */}
      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>EVALUACIÓN PSICOLÓGICA</span>

          <h1>{K10_TEST.nombre}</h1>

          <p>
            Piense en los últimos 30 días y seleccione una respuesta para cada
            pregunta.
          </p>
        </div>

        <div className={styles.timerPanel}>
          <span className={styles.timerLabel}>TIEMPO RESTANTE</span>

          <div className={timerClass}>
            {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
          </div>
        </div>
      </header>

      {/* NAVEGADOR SUPERIOR */}
      <TestNavigator
        total={K10_TEST.preguntas.length}
        actual={preguntaActual}
        respondidas={respuestas.map((r) => r !== 0)}
        visitadas={visitadas}
        onSelect={irAPregunta}
        disabled={engine.inputLocked}
        itemLabel="Pregunta"
      />
      {/* PREGUNTA Y OPCIONES ABAJO */}
      <section className={styles.content}>
        <fieldset className={styles.testCard} disabled={engine.inputLocked}>
          <legend className={styles.questionLegend}>
            PREGUNTA {preguntaActual + 1} DE {totalPreguntas}
          </legend>

          <h2
            id="k10-question"
            ref={questionRef}
            tabIndex={-1}
            className={styles.questionTitle}
          >
            {K10_TEST.preguntas[preguntaActual]}
          </h2>

          <div
            className={styles.testCardItems}
            role="radiogroup"
            aria-labelledby="k10-question"
          >
            {K10_TEST.opciones.map((opcion) => {
              const seleccionada = respuestas[preguntaActual] === opcion.valor;

              return (
                <label
                  key={opcion.valor}
                  className={`${styles.answerOption} ${
                    seleccionada ? styles.answerSelected : ""
                  }`}
                >
                  <input
                    type="radio"
                    name={`k10-${preguntaActual}`}
                    value={opcion.valor}
                    checked={seleccionada}
                    disabled={engine.inputLocked}
                    onChange={() => responder(preguntaActual, opcion.valor)}
                  />

                  <span className={styles.radioVisual} />

                  <span className={styles.answerText}>{opcion.label}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {/* NAVEGACIÓN INFERIOR */}
        <TestNavigationFooter
          actual={preguntaActual}
          total={K10_TEST.preguntas.length}
          respondidas={respondidas}
          totalRespuestas={K10_TEST.preguntas.length}
          onPrevious={() => irAPregunta(preguntaActual - 1)}
          onNext={() => irAPregunta(preguntaActual + 1)}
          onFinish={calcularResultado}
          disabled={engine.inputLocked}
          enviando={enviando}
          itemLabel="Pregunta"
          descripcion="Podés revisar y modificar tus respuestas antes de finalizar."
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
