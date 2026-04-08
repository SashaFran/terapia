import { useState, useRef } from "react";
import { BFQ_TEST } from "../../../data/tests/BFQ_TEST";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal";

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
  onFinish: (resultado: ResultadoBFQ) => void;
};

export default function TestBFQ({ onFinish }: Props) {
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(BFQ_TEST.preguntas.length).fill(0)
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0);

  const iniciarTest = () => {
    setTestIniciado(true);
    startTimeRef.current = Date.now();
  };

  const responder = (index: number, valor: number) => {
    setRespuestas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  // ⚠️ EJEMPLO SIMPLE DE DIMENSIONES (después lo ajustamos fino)
  const dimensionesMap = {
    extraversion: [0, 5],
    amabilidad: [2, 3],
    responsabilidad: [4, 6],
    neuroticismo: [8],
    apertura: [1, 7, 9],
  };

  const calcularDimension = (indices: number[]) =>
    indices.reduce((acc, i) => acc + (respuestas[i] || 0), 0);

  const calcularResultado = () => {
    if (!testIniciado) return;

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;

    const resultado = {
      extraversion: calcularDimension(dimensionesMap.extraversion),
      amabilidad: calcularDimension(dimensionesMap.amabilidad),
      responsabilidad: calcularDimension(dimensionesMap.responsabilidad),
      neuroticismo: calcularDimension(dimensionesMap.neuroticismo),
      apertura: calcularDimension(dimensionesMap.apertura),
    };

    onFinish({
      dimensiones: resultado,
      respuestas,
      metodo: "BFQ",
      tiempoTotalMs,
    });
  };

  const incompleto = respuestas.some((r) => r === 0);

  if (!testIniciado) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones - Test BFQ"
      >
        <li>
          Esta evaluación mide diferentes dimensiones de la personalidad.
        </li>
        <li>
          Responda con sinceridad. No hay respuestas correctas o incorrectas.
        </li>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
          <BotonPersonalizado variant="primary" onClick={iniciarTest} disabled={false}>
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={styles.nav}>
        <h2>{BFQ_TEST.nombre}</h2>
      </div>

      <div className={styles.testContainer}>
        {BFQ_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>

            <div className={styles.testCardItems}>
              {BFQ_TEST.opciones.map((op) => (
                <label key={op.valor} style={{ display: "flex", alignItems: "center" }}>
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
          disabled={incompleto}
          onClick={calcularResultado}
        >
          Finalizar test
        </BotonPersonalizado>
      </div>
    </div>
  );
}