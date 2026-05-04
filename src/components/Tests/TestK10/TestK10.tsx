import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish?: (resultado: any) => void | Promise<void>;
  userId?: string | number;
};

export default function TestK10({ onFinish, userId }: Props) {
  const navigate = useNavigate();

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0),
  );

  const pacienteStorage = localStorage.getItem("paciente");
  const paciente = pacienteStorage ? JSON.parse(pacienteStorage) : null;
  const resolvedUserId =
    userId ?? paciente?.id ?? localStorage.getItem("pacienteId");

  const engine = useTestEngine({
    userId: resolvedUserId,
    testId: "k10",
    timeLimitMs: 30 * 60 * 1000,
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

  const calcularResultado = async () => {
    if (!engine.started || enviando) return;
    setEnviando(true);

    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";

    try {
      await engine.submit({
        score: total,
        nivel,
        respuestas,
        metodo: "K10",
      });
    } catch (error) {
      console.error("❌ Error al guardar el K10:", error);
      setEnviando(false);
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  if (!engine.started) {
    return (
      <Modal abierto={true} onCerrar={() => {}} titulo="">
        <div>
          <strong>Bienvenido/a.</strong>{" "}
          <p>
            {" "}
            Antes de comenzar, por favor lea atentamente las siguientes
            indicaciones para asegurar un resultado preciso:
          </p>
          <ol>
            <li>
              <strong>El objetivo:</strong>
              <li>
                Este cuestionario consta de 10 preguntas sobre cómo se ha
                sentido en los últimos 30 días.
              </li>
            </li>
            <li>
              <strong>Cómo responder:</strong>
              <li>
                Para cada frase, seleccione la opción que mejor describa la
                frecuencia de ese sentimiento (desde "Nunca" hasta "Siempre").
                <li>
                  No piense demasiado sus respuestas; la primera impresión suele
                  ser la más honesta. Responda según su estado real en el último
                  mes, no cómo se siente habitualmente.
                </li>
              </li>
            </li>
            <li className="padding">
              Tiene <strong>30 minutos</strong> para completar el test y se
              realizarán capturas a traves de la camara para verificar su
              identidad.
              <br />
              <strong>Importante:</strong> Es necesario que acepte o no podra
              ser evaluado.
            </li>
          </ol>
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
            disabled={!canStart || !resolvedUserId}
          >
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  return (
    <div className={`container scrollbar`}>
      <div className={styles.nav}>
        <h2>{K10_TEST.nombre}</h2>
        <div className={timerClass}>
          {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
        </div>
      </div>
      {engine.CameraComponent && <engine.CameraComponent />}

      <div className={styles.testContainer}>
        {K10_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>

            <div className={styles.testCardItems}>
              {K10_TEST.opciones.map((op) => (
                <label key={op.valor}>
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    checked={respuestas[i] === op.valor}
                    onChange={() => responder(i, op.valor)}
                  />
                  {op.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <BotonPersonalizado
          variant="primary"
          disabled={incompleto || enviando}
          onClick={calcularResultado}
        >
          {enviando ? "Guardando..." : "Finalizar test"}
        </BotonPersonalizado>
      </div>
    </div>
  );
}