import { useState, useEffect, useRef } from "react";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
// Asegúrate de que esta ruta sea correcta para tu componente Modal global
import Modal from "../../Modal/Modal.tsx";

type ResultadoK10 = {
  score: number;
  nivel: string;
  respuestas: number[];
  metodo: string;
  tiempoTotalMs: number; // 👈 Añadimos el tiempo total en milisegundos
};

type Props = {
  onFinish: (resultado: ResultadoK10) => void;
};

export default function TestK10({ onFinish }: Props) {
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0),
  );

  // Estados para controlar el inicio del test y el tiempo
  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0); // Usamos useRef para almacenar el timestamp de inicio

  // ----------------------
  // Lógica del test y tiempo
  // ----------------------
  const iniciarTest = () => {
    setTestIniciado(true);
    startTimeRef.current = Date.now(); // Registramos el momento exacto en que se hace clic en Iniciar
  };

  const responder = (index: number, valor: number) => {
    setRespuestas((prev) => {
      const copia = [...prev];
      copia[index] = valor;
      return copia;
    });
  };

  const calcularResultado = () => {
    if (!testIniciado) return;

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current; // Calculamos la duración

    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";

    onFinish({
      score: total,
      nivel,
      respuestas,
      metodo: "K10 - método 1",
      tiempoTotalMs: tiempoTotalMs, // Incluimos el tiempo en el resultado final
    });
  };

  const incompleto = respuestas.some((r) => r === 0);

  // ----------------------
  // Renderizado Condicional
  // ----------------------

  // Si el test no ha iniciado, mostramos el modal de bienvenida
  if (!testIniciado) {
    return (
      <Modal
        abierto={true} // Siempre abierto hasta que se inicia el test
        onCerrar={() => {}} // No permitimos cerrar sin iniciar
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
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <BotonPersonalizado variant="primary" onClick={iniciarTest}>
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  // Si el test ya inició, mostramos el formulario normalmente
  return (
    <div className={`global-container ${styles.container}`}>
      <div className={styles.nav}>
        <h2>{K10_TEST.nombre}</h2>
      </div>
      
      <div className={styles.testContainer}>
        {K10_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p>
              <strong>{i + 1}.</strong> {pregunta}
            </p>

            <div key={i} className={styles.testCardItems}>
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
          disabled={incompleto}
          onClick={calcularResultado}
        >
          Finalizar test
        </BotonPersonalizado>
      </div>
    </div>
  );
}
