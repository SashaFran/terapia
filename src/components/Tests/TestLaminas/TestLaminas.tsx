import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import { useState } from "react";
import { BENDER_TEST } from "../../../data/tests/bender_test";
import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";
import TestProgress from "../helpers/TestProgress";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestLaminas.module.css";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";
import { LAMINAS_TEST } from "../../../data/tests/LAMINAS_TEST";

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number;
};

export default function TestLaminas({ onFinish, userId }: Props) {
  const [zulliger, setZulliger] = useState<string[]>(Array(ZULLIGER_TEST.imagenes.length).fill(""));
  const [bender, setBender] = useState<string[]>(Array(BENDER_TEST.imagenes.length).fill(""));
  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const zulligerCompleto = zulliger.some((r) => r && r !== "");
  const benderCompleto = bender.some((r) => r && r !== "");
  const puedeFinalizar = zulligerCompleto && benderCompleto;

  const totalPreguntas = LAMINAS_TEST.preguntas.length;
  const respuestasMapeadas = [...zulliger, ...bender];

  const engine = useTestEngine({
    userId,
    testId: "laminas",
    timeLimitMs: 30 * 60 * 1000,
    getResult: () => obtenerResultado(),
    onFinish,
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;

  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;

  const obtenerResultado = () => ({
    respuestas: [
      ...zulliger.map((r, i) => ({ pregunta: `Zulliger ${i + 1}`, respuesta: r || "Sin respuesta" })),
      ...bender.map((r, i) => ({ pregunta: `Bender ${i + 1}`, respuesta: r || "Sin respuesta" })),
    ],
    metodo: "Laminas", nivel: "Interpretación Láminas",
  });
  const finalizar = async () => {
    if (engine.inputLocked || enviando || !puedeFinalizar) return;
    setEnviando(true);
    try { await engine.submit(obtenerResultado()); }
    catch { setEnviando(false); }
  };

  if (!engine.started) {
    return <TestIntroModal nombre="Evaluación con láminas" descripcion="Observe las imágenes y describa su interpretación"
      canStart={canStart} onConsentChange={setCanStart} onStart={engine.start}
      startDisabled={false} instrucciones={[{ titulo: "Observe cada imagen", texto: <p>Mire las láminas con atención. Puede ver una o varias cosas en una misma imagen.</p> },
{ titulo: "Escriba lo que ve", texto: <p>Describa qué imagina y qué le parece cada imagen. No hay respuestas correctas o incorrectas.</p> }]} />;
  }

  const imagenes = [...ZULLIGER_TEST.imagenes, ...BENDER_TEST.imagenes];
  return (
    <main className={styles.page}>
      {engine.feedback}
      {engine.CameraComponent && <engine.CameraComponent />}
      <header className={styles.header}>
        <div><h1>Evaluación con láminas</h1><p>Observe cada imagen y escriba su interpretación. Puede revisar sus respuestas antes de finalizar.</p></div>
        <div><span>Tiempo restante</span><div className={timerClass}>{engine.minutes}:{String(engine.seconds).padStart(2, "0")}</div></div>
      </header>
      <div className={styles.workspace}>
        <TestProgress total={totalPreguntas} completadas={respuestasMapeadas.map(r => Boolean(r.trim()))} />
        <div className={styles.container}>
          {imagenes.map((img, i) => (
            <section key={i} id={`test-item-${i}`} className={styles.testCard}>
              <h2>{LAMINAS_TEST.preguntas[i]}</h2>
              <img className={styles.imagen} src={img} alt={LAMINAS_TEST.preguntas[i]} />
              <label htmlFor={`lamina-${i}`}>¿Qué ve, siente o piensa al observar esta lámina?</label>
              <textarea id={`lamina-${i}`} className={styles.textarea} disabled={engine.inputLocked} value={respuestasMapeadas[i]}
                onChange={e => {
                  const value = e.target.value;
                  if (i < zulliger.length) setZulliger(prev => prev.map((r, index) => index === i ? value : r));
                  else setBender(prev => prev.map((r, index) => index === i - zulliger.length ? value : r));
                }} />
            </section>
          ))}
          <BotonPersonalizado onClick={finalizar} disabled={engine.inputLocked || enviando || !puedeFinalizar} variant="primary">
            {enviando ? "Guardando..." : "Finalizar evaluación completa"}
          </BotonPersonalizado>
        </div>
      </div>
    </main>
  );
}
