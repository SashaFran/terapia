import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish?: (resultado: { score: number; nivel: string; respuestas: number[]; metodo: string }) => void | Promise<void>;
  userId?: string | number;
};

export default function TestK10({ onFinish, userId }: Props) {
  const navigate = useNavigate();

  const [preguntaActual, setPreguntaActual] = useState(0);
  const questionRef = useRef<HTMLHeadingElement>(null);
  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0),
  );
  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(K10_TEST.preguntas.length).fill(false);
    iniciales[0] = true;
    return iniciales;
  });

  const pacienteStorage = localStorage.getItem("paciente");
  const paciente = pacienteStorage ? JSON.parse(pacienteStorage) : null;
  const resolvedUserId =
    userId ?? paciente?.id ?? localStorage.getItem("pacienteId");

  const engine = useTestEngine({
    userId: resolvedUserId,
    testId: "k10",
    timeLimitMs: 30 * 60 * 1000,
    getResult: () => obtenerResultado(),
    onFinish: async (data) => {
      if (onFinish) await onFinish(data);
      navigate("/app/dashboard", { replace: true });
    },
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;
  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;

  const responder = (index: number, valor: number) => {
    setRespuestas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  const irAPregunta = (index: number) => {
    setPreguntaActual(index);
    setVisitadas((prev) => {
      if (prev[index]) return prev;
      const copia = [...prev];
      copia[index] = true;
      return copia;
    });
  };

  const obtenerResultado = () => {
    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";
    return { score: total, nivel, respuestas, metodo: "K10" };
  };

  const calcularResultado = async () => {
    if (!engine.started || enviando) return;
    setEnviando(true);

    try {
      await engine.submit(obtenerResultado());
    } catch (error) {
      console.error("❌ Error al guardar el K10:", error);
      setEnviando(false);
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  useEffect(() => {
    if (!engine.started) return;
    questionRef.current?.focus({ preventScroll: true });
    questionRef.current?.scrollIntoView({
      block: "nearest",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    });
  }, [preguntaActual, engine.started]);

  if (!engine.started) {
    return <TestIntroModal nombre="Cuestionario K10" descripcion="Cómo se ha sentido en los últimos 30 días"
      canStart={canStart} onConsentChange={setCanStart} onStart={engine.start}
      startDisabled={!resolvedUserId} instrucciones={[{ titulo: "Piense en el último mes", texto: <p>Este cuestionario contiene 10 preguntas. Responda según cómo se ha sentido durante los últimos 30 días.</p> },
{ titulo: "Seleccione una respuesta", texto: <p>Elija la frecuencia que mejor describa su experiencia. Puede volver a las preguntas anteriores para revisar sus respuestas.</p> }]} />;
  }

  const respondidas = respuestas.filter(Boolean).length;
  const ultima = preguntaActual === K10_TEST.preguntas.length - 1;
  return (
    <main className={styles.page}>
      {engine.feedback}
      {engine.CameraComponent && <engine.CameraComponent />}
      <header className={styles.header}>
        <div><h1>{K10_TEST.nombre}</h1><p>Piense en los últimos 30 días y seleccione una respuesta para cada pregunta.</p></div>
        <div><span>Tiempo restante</span><div className={timerClass}>{engine.minutes}:{String(engine.seconds).padStart(2, "0")}</div></div>
      </header>
      <p role="status">{respondidas} de {respuestas.length} preguntas respondidas</p>
      <progress className={styles.progress} aria-label="Preguntas respondidas" value={respondidas} max={respuestas.length} />
      <div className={styles.workspace}>
        <nav className={styles.navigator} aria-label="Preguntas del K10">
          <h2>Preguntas</h2>
          <div className={styles.questionGrid}>{respuestas.map((r, i) => (
              <button key={i} type="button" disabled={engine.inputLocked} onClick={() => irAPregunta(i)}
              aria-current={i === preguntaActual ? "step" : undefined}
              aria-label={`Pregunta ${i + 1}, ${r ? "respondida" : visitadas[i] ? "sin responder" : "pendiente"}`}>
              {i + 1}{r ? " ✓" : ""}
            </button>
          ))}</div>
          <p>✓ Respondida. Puede volver a revisar cualquier pregunta.</p>
        </nav>
        <section className={styles.content}>
          <fieldset className={styles.testCard} disabled={engine.inputLocked}>
            <legend>Pregunta {preguntaActual + 1} de {respuestas.length}</legend>
            <h2 id="k10-question" ref={questionRef} tabIndex={-1}>{K10_TEST.preguntas[preguntaActual]}</h2>
            <div className={styles.testCardItems} role="radiogroup" aria-labelledby="k10-question">
              {K10_TEST.opciones.map(op => (
                <label key={op.valor}>
                  <input type="radio" name={`k10-${preguntaActual}`} value={op.valor}
                    checked={respuestas[preguntaActual] === op.valor} onChange={() => responder(preguntaActual, op.valor)} />
                  {op.label}
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.navigation}>
            <BotonPersonalizado variant="secondary" disabled={preguntaActual === 0 || engine.inputLocked}
              onClick={() => setPreguntaActual(i => i - 1)}>Anterior</BotonPersonalizado>
            {ultima ? <BotonPersonalizado variant="primary" disabled={incompleto || enviando || engine.inputLocked} onClick={calcularResultado}>
              {enviando ? "Guardando..." : "Finalizar test"}
            </BotonPersonalizado> : <BotonPersonalizado variant="primary" disabled={engine.inputLocked}
              onClick={() => irAPregunta(preguntaActual + 1)}>Siguiente</BotonPersonalizado>}
          </div>
          <p>{ultima && incompleto ? "Responda las preguntas pendientes para finalizar." : "Puede cambiar su respuesta antes de finalizar."}</p>
        </section>
      </div>
    </main>
  );
}
