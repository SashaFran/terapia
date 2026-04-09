import { useRef, useState, type Key } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../../Modal/Modal";
import styles from "./TestRaven.module.css";
import { RAVEN_TEST } from "../../../data/tests/raven_test";

type Props = {
  onFinish: (resultado: any) => void;
};


const RESPUESTAS_CORRECTAS = [1,7,8,5,5,7,6,8,1,1,6,3];

export default function TestRaven({ onFinish }: Props) {
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(RAVEN_TEST.imagenes.length).fill("")
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0);

  // ----------------------
  // INICIO TEST
  // ----------------------
  const iniciarTest = () => {
    setTestIniciado(true);
    startTimeRef.current = Date.now();
  };

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
    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;

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

    onFinish({
      score: 12 - errores,
      errores,
      nivel,
      respuestas: respuestas.map((r, i) => ({
        pregunta: `Matriz ${i + 1}`,
        respuesta: r || "Sin respuesta",
      })),
      metodo: "Test Raven",
      tiempoTotalMs,
    });
  };

  // ----------------------
  // MODAL INICIAL
  // ----------------------
  if (!testIniciado) {
    return (
        <Modal
        abierto={true} // Siempre abierto hasta que se inicia el test
        onCerrar={() => {}} // No permitimos cerrar sin iniciar
        titulo="Instrucciones para la Evaluación con Láminas"
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
        <li style={{marginTop: "1rem"}}>
          Por favor, <strong>relájese</strong>, mire atentamente cada imagen y
          responda con total <strong>sinceridad</strong>. 
        </li>
        <li>
          Se presentarán una serie de matrices <strong>incompletas</strong>. Debe indicar el número de la opción <strong>correcta</strong> que completa la figura.          
        </li>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <BotonPersonalizado variant="primary" onClick={iniciarTest} disabled={false}>
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
      <h2>Test de Raven</h2>

      {RAVEN_TEST.imagenes.map((img: string | undefined, i: Key | null | undefined) => (
        <div key={i} className={styles.fila}>
          <img src={img} className={styles.imagen} />

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