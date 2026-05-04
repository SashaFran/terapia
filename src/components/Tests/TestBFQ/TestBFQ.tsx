import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { BFQ_TEST } from "../../../data/tests/BFQ_TEST";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import relojStyle from "../helpers/countdown.module.css";
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
  userId: string | number; // ID necesario para el monitoreo
};

export default function TestBFQ({ onFinish, userId }: Props) {
  const navigate = useNavigate();
  const [canStart, setCanStart] = useState(false);
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(BFQ_TEST.preguntas.length).fill(0),
  );

  const [enviando, setEnviando] = useState(false);
  const engine = useTestEngine({
    userId,
    testId: "bfq",
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

  const responder = (index: number, valor: number) => {
    setRespuestas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  const dimensionesMap = {
    extraversion: [0, 5],
    amabilidad: [2, 3],
    responsabilidad: [4, 6],
    neuroticismo: [8],
    apertura: [1, 7, 9],
  };

  const calcularDimension = (indices: number[]) =>
    indices.reduce((acc, i) => acc + (respuestas[i] || 0), 0);

  const calcularResultado = async () => {
    if (!engine.started || enviando) return;

    setEnviando(true);

    const resultado = {
      extraversion: calcularDimension(dimensionesMap.extraversion),
      amabilidad: calcularDimension(dimensionesMap.amabilidad),
      responsabilidad: calcularDimension(dimensionesMap.responsabilidad),
      neuroticismo: calcularDimension(dimensionesMap.neuroticismo),
      apertura: calcularDimension(dimensionesMap.apertura),
    };

    try {
      await engine.submit({
        dimensiones: resultado,
        respuestas,
        metodo: "BFQ",
        nivel: "Perfil Big Five",
        score: Object.values(resultado).reduce((acc, val) => acc + val, 0),
      });
    } catch (error) {
      console.error("Error al finalizar:", error);
      setEnviando(false);
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  if (!engine.started) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones - Test BFQ"
      >
        <div style={{ marginBottom: "15px" }}>
          <li>
           A continuación encontrará una serie de frases sobre formas de pensar, sentir o actuar. Mire atentamente cada una y marque la opción que mejor describa su forma de ser.
          </li>
          <li className="padding">
            Tiene <strong>30 minutos</strong> para completar el test y se realizarán capturas a traves de la camara para verificar su identidad.
            <br />
            <strong>Importante:</strong> Es necesario que acepte o no podra ser evaluado.
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
        <h2>{BFQ_TEST.nombre}</h2>
        <div className={timerClass}>
          {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
        </div>
      </div>
      {engine.CameraComponent && <engine.CameraComponent />}

      <div className={styles.testContainer}>
        {BFQ_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>
            <div className={styles.testCardItems}>
              {BFQ_TEST.opciones.map((op) => (
                <label
                  key={op.valor}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    checked={respuestas[i] === op.valor}
                    onChange={() => responder(i, op.valor)}
                    style={{ marginRight: "8px" }}
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
