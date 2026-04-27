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
  const resolvedUserId = userId ?? paciente?.id ?? localStorage.getItem("pacienteId");

  const engine = useTestEngine({
    userId: resolvedUserId,
    testId: "k10",
    timeLimitMs: 15 * 60 * 1000,
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
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación (K-10)"
      >
          <div style={{ marginBottom: "15px" }}>
            <li className="">Las siguientes preguntas tratan sobre cómo se ha sentido usted durante los últimos 30 días (o las últimas 4 semanas). 
              <br />Por favor, para cada pregunta, marque la opción que <strong>mejor describa</strong> la frecuencia con la que tuvo ese sentimiento. 
              <br />No hay respuestas correctas o incorrectas; si no está seguro de alguna, elija la que más se acerque a su situación.</li>
            <li className="margin">
            Esta evaluación <strong>monitoriza el tiempo</strong> de completado
            y realiza capturas de identidad aleatorias.
            <br />
            <strong>Importante:</strong> Esto no afecta su puntuación final.
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
