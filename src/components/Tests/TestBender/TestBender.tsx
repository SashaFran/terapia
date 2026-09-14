import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BENDER_TEST } from "../../../data/tests/bender_test";
import RotatableImage from "./RotatableImage";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestBender.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
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

  if (!engine.started) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones - Test Bender"
      >
        <div style={{ marginBottom: "15px" }}>
          <p>
            En esta prueba, se encontrarán distintas láminas. Para cada una de ellas, deberá escribir en cada renglón lo que ve u opina respecto de dicha lámina, así como también qué siente o piensa al verla.
          </p>
          <p>
            Tiene <strong>30 minutos</strong> para completar el test y se realizarán capturas a través de la cámara para verificar su identidad.
            <br />
            <strong>Importante:</strong> Es necesario que acepte o no podrá ser evaluado.
          </p>
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
            onClick={engine.start}
            disabled={!canStart}
          >
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  return (
    <div className={`container scrollbar`}>
      <div className={`nav`}>
        <h2>{BENDER_TEST.nombre}</h2>
        <div className={timerClass}>
          {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
        </div>
      </div>
      {engine.CameraComponent && <engine.CameraComponent />}

      <div className={styles.container}>
        {BENDER_TEST.imagenes.map((img, i) => (
          <div key={i} className={styles.containerImg}>
            <RotatableImage src={img} />
            <textarea
              placeholder="¿Qué ves en esta lámina? ¿Qué sientes o piensas al verla?"
              value={respuestas[i]}
              onChange={(e) => handleChange(i, e.target.value)}
              className={styles.textarea}
            />
          </div>
        ))}

        <BotonPersonalizado
          onClick={finalizar}
          disabled={enviando}
          variant="primary"
        >
          {enviando ? "Enviando..." : "Finalizar Test"}
        </BotonPersonalizado>
      </div>
    </div>
  );
}