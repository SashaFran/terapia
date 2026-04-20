import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom"; // 1. Importamos el hook
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal.tsx";

type ResultadoK10 = {
  score: number;
  nivel: string;
  respuestas: number[];
  metodo: string;
  tiempoTotalMs: number;
};

type Props = {
  // Cambiado a void | Promise<void> para esperar al guardado
  onFinish: (resultado: ResultadoK10) => void | Promise<void>;
};

export default function TestK10({ onFinish }: Props) {
  const navigate = useNavigate(); // 2. Inicializamos navigate
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0),
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false); // 3. Estado de carga
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

  // 4. Función asíncrona para manejar el final y la navegación
  const calcularResultado = async () => {
    if (!testIniciado || enviando) return;

    setEnviando(true); // Bloqueamos el botón

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;

    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";

    try {
      // Esperamos a que el proceso de guardado del padre termine
      await onFinish({
        score: total,
        nivel,
        respuestas,
        metodo: "K10 - método 1",
        tiempoTotalMs: tiempoTotalMs,
      });

      // Navegamos al dashboard o ruta de éxito
      // replace: true evita que al volver atrás regresen al test
      navigate('/app/dashboard', { replace: true });

    } catch (error) {
      console.error("Error al guardar el K10:", error);
      setEnviando(false); // Permitimos reintentar si falla
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  if (!testIniciado) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación (K-10)"
      >
        <li>
          Esta evaluación <strong>monitoriza el tiempo</strong> que se tarda en
          completarse, con fines exclusivamente estadísticos y de investigación
          interna.
        </li>
        <li>
          <strong>Importante:</strong> El tiempo empleado{" "}
          <strong>no afectará</strong> a la puntuación final de su evaluación ni
          a los resultados clínicos.
        </li>
        <li>
          Por favor, <strong>relájese</strong>, lea atentamente cada pregunta y
          responda con total <strong>sinceridad</strong>.
        </li>
        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
          <BotonPersonalizado variant="primary" onClick={iniciarTest} disabled={false}>
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>{K10_TEST.nombre}</h2>
      </div>
      
      <div className={styles.testContainer}>
        {K10_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>

            <div className={styles.testCardItems}>
              {K10_TEST.opciones.map((op) => (
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
          disabled={incompleto || enviando}
          onClick={calcularResultado}
        >
          {enviando ? "Guardando..." : "Finalizar test"}
        </BotonPersonalizado>
      </div>
    </div>
  );
}
