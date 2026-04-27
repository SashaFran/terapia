import { useState } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../../Modal/Modal";
import styles from "./TestRaven.module.css";
import { RAVEN_TEST } from "../../../data/tests/raven_test";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number; // Prop necesaria para las fotos
};

const RESPUESTAS_CORRECTAS = [1, 7, 8, 5, 5, 7, 6, 8, 1, 1, 6, 3];

export default function TestRaven({ onFinish, userId }: Props) {
  const [canStart, setCanStart] = useState(false);
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(RAVEN_TEST.imagenes.length).fill(""),
  );

  const engine = useTestEngine({
    userId,
    testId: "raven",
    timeLimitMs: 20 * 60 * 1000,
    onFinish,
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;
  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;

  // ----------------------
  // INICIO TEST
  // ----------------------
  const iniciarTest = () => engine.start();

  // ----------------------
  // HANDLE INPUT
  // ----------------------
  const handleChange = (index: number, value: string) => {
    const nuevas = [...respuestas];
    nuevas[index] = value;
    setRespuestas(nuevas);
  };

  // ----------------------
  // FINALIZAR
  // ----------------------
  const finalizar = () => {
    let errores = 0;
    respuestas.forEach((r, i) => {
      if (Number(r) !== RESPUESTAS_CORRECTAS[i]) {
        errores++;
      }
    });

    let nivel = "Inferior";
    if (errores === 0) nivel = "Superior";
    else if (errores <= 2) nivel = "Normal Superior";
    else if (errores <= 4) nivel = "Normal Promedio";

    engine.submit({
      score: 12 - errores,
      errores,
      nivel,
      respuestas: respuestas.map((r, i) => ({
        pregunta: `Matriz ${i + 1}`,
        respuesta: r || "Sin respuesta",
      })),
      metodo: "Test Raven",
    });
  };

  // ----------------------
  // MODAL INICIAL
  // ----------------------
  if (!engine.started) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación con Láminas"
      >
        <div style={{ marginBottom: "1rem" }}>
          <li>
            Esta evaluación <strong>monitoriza el tiempo</strong> de completado
            y realiza capturas de identidad aleatorias.
          </li>
          <li>
            <strong>Importante:</strong> Esto no afecta su puntuación final.
          </li>
          <li style={{ marginTop: "1rem" }}>
            Se presentarán matrices <strong>incompletas</strong>. Indique el
            número de la opción <strong>correcta</strong>.
          </li>
        </div>

        <ConsentimientoCamara changeStatus={setCanStart} />

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <BotonPersonalizado
            variant="primary"
            onClick={iniciarTest}
            disabled={!canStart}
          >
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  // ----------------------
  // RENDER
  // ----------------------
  return (
    <div className={styles.container}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Test de Raven</h2>
        <div className={timerClass}>
          {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
        </div>
      </div>
      {engine.CameraComponent && <engine.CameraComponent />}

      {RAVEN_TEST.imagenes.map((img: string, i: number) => (
        <div key={i} className={styles.fila}>
          <img src={img} alt={`Matriz ${i + 1}`} className={styles.imagen} />

          <input
            type="text"
            value={respuestas[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder="Respuesta"
            className={styles.input}
          />
        </div>
      ))}

      <BotonPersonalizado
        className={styles.boton}
        onClick={finalizar}
        disabled={respuestas.some((r) => r === "")}
        variant="primary"
      >
        Finalizar test
      </BotonPersonalizado>
    </div>
  );
}
