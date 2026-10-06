import TestProgress from "../helpers/TestProgress";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BENDER_TEST } from "../../../data/tests/bender_test";
import RotatableImage from "./RotatableImage";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestBender.module.css";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish: (resultado: any) => void | Promise<void>;
  userId: string | number;
};

export default function TestBender({ onFinish, userId }: Props) {
  const navigate = useNavigate();
  const [canStart, setCanStart] = useState(false);
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(BENDER_TEST.imagenes.length).fill("")
  );
  const [laminaActual, setLaminaActual] = useState(0);
  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(BENDER_TEST.imagenes.length).fill(false);
    iniciales[0] = true;
    return iniciales;
  });
  const [enviando, setEnviando] = useState(false);

  const engine = useTestEngine({
    userId,
    testId: "bender",
    timeLimitMs: 30 * 60 * 1000,
    onFinish: async (data) => {
      await onFinish(data);
      navigate("/app/tests", { replace: true });
    },
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;
  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;

  const handleChange = (index: number, texto: string) => {
    const copy = [...respuestas];
    copy[index] = texto;
    setRespuestas(copy);
    engine.update({ respuestas: copy });
  };

  const finalizar = async () => {
    if (!engine.started || enviando) return;
    setEnviando(true);

    try {
      await engine.submit({
        respuestas,
        nivel: "Interpretación Láminas",
        metodo: "Bender",
      });
    } catch (error) {
      console.error("Error al finalizar:", error);
      setEnviando(false);
    }
  };

  const irALamina = (index: number) => {
    setLaminaActual(index);
    setVisitadas((prev) => {
      if (prev[index]) return prev;
      const copia = [...prev];
      copia[index] = true;
      return copia;
    });
  };

  const irSiguiente = () => {
    if (laminaActual < respuestas.length - 1) {
      irALamina(laminaActual + 1);
    }
  };

  const irAnterior = () => {
    if (laminaActual > 0) {
      irALamina(laminaActual - 1);
    }
  };

  if (!engine.started) {
    return <TestIntroModal nombre="Test Bender" descripcion="Observe las láminas y escriba su respuesta"
      canStart={canStart} onConsentChange={setCanStart} onStart={engine.start}
      startDisabled={false} instrucciones={[{ titulo: "Observe cada lámina", texto: <p>Mire cada imagen con atención.</p> },
{ titulo: "Escriba su respuesta", texto: <p>Describa qué ve y qué siente o piensa al observarla. Puede revisar lo escrito antes de finalizar.</p> }]} />;
  }

  return (
    <div className={styles.page}>
      {engine.feedback}
      <header className={styles.header}>
        <div><h1>{BENDER_TEST.nombre}</h1><p>Observe cada lámina y escriba qué ve, siente o piensa al verla.</p></div>
        <div aria-label="Tiempo restante" className={timerClass}>
          {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
        </div>
      </header>
      {engine.CameraComponent && <engine.CameraComponent />}

      <div className={styles.workspace}>
      <TestProgress
        total={respuestas.length}
        completadas={respuestas.map((r) => Boolean(r.trim()))}
        visitadas={visitadas}
        activa={laminaActual}
        onSelect={irALamina}
      />
      <div className={styles.container}>
        <div id={`test-item-${laminaActual}`} className={styles.containerImg}>
            <h2>Lámina {laminaActual + 1}</h2>
            <RotatableImage src={BENDER_TEST.imagenes[laminaActual]} />
            <label htmlFor={`bender-${laminaActual}`}>Su respuesta para la lámina {laminaActual + 1}</label>
            <textarea
              id={`bender-${laminaActual}`}
              disabled={engine.inputLocked}
              placeholder="¿Qué ves en esta lámina? ¿Qué sientes o piensas al verla?"
              value={respuestas[laminaActual]}
              onChange={(e) => handleChange(laminaActual, e.target.value)}
              className={styles.textarea}
            />
        </div>

        <div className={styles.navigation}>
          <BotonPersonalizado onClick={irAnterior} disabled={laminaActual === 0 || engine.inputLocked} variant="secondary">
            Anterior
          </BotonPersonalizado>
          {laminaActual < respuestas.length - 1 && (
            <BotonPersonalizado onClick={irSiguiente} disabled={engine.inputLocked} variant="primary">
              Siguiente
            </BotonPersonalizado>
          )}
        </div>

        <BotonPersonalizado
          onClick={finalizar}
          disabled={enviando || engine.inputLocked}
          variant="primary"
        >
          {enviando ? "Enviando..." : "Finalizar Test"}
        </BotonPersonalizado>
      </div>
      </div>
    </div>
  );
}
