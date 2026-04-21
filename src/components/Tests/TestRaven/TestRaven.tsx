import { useRef, useState, useEffect, type Key } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../../Modal/Modal";
import styles from "./TestRaven.module.css";
import { RAVEN_TEST } from "../../../data/tests/raven_test";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import { iniciarMonitoreo } from "../../../services/cameraService.tsx"; 

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number; // Prop necesaria para las fotos
};

const RESPUESTAS_CORRECTAS = [1, 7, 8, 5, 5, 7, 6, 8, 1, 1, 6, 3];

export default function TestRaven({ onFinish, userId }: Props) {
  const [canStart, setCanStart] = useState(false);
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(RAVEN_TEST.imagenes.length).fill("")
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0);
  
  // Referencia para la función de apagado de cámara
  const stopCameraRef = useRef<(() => void) | null>(null);

  // Limpieza automática al desmontar el componente
  useEffect(() => {
    return () => {
      if (stopCameraRef.current) {
        stopCameraRef.current();
      }
    };
  }, []);

  // ----------------------
  // INICIO TEST
  // ----------------------
  const iniciarTest = async () => {
    // Iniciamos monitoreo antes de marcar el inicio del test
    const cleanup = await iniciarMonitoreo(userId);
    if (cleanup) {
      stopCameraRef.current = cleanup;
    }

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
    // Apagamos la cámara inmediatamente
    if (stopCameraRef.current) {
      stopCameraRef.current();
      stopCameraRef.current = null;
    }

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
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación con Láminas"
      >
        <div style={{ marginBottom: "1rem" }}>
          <li>
            Esta evaluación <strong>monitoriza el tiempo</strong> de completado y 
            realiza capturas de identidad aleatorias.
          </li>
          <li>
            <strong>Importante:</strong> Esto no afecta su puntuación final.
          </li>
          <li style={{ marginTop: "1rem" }}>
            Se presentarán matrices <strong>incompletas</strong>. Indique el número de la opción <strong>correcta</strong>.
          </li>
        </div>

        <ConsentimientoCamara changeStatus={setCanStart} />

        <div style={{ display: "flex", justifyContent: "center", marginTop: "20px" }}>
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
      <h2>Test de Raven</h2>

      {RAVEN_TEST.imagenes.map((img: string, i: number) => (
        <div key={i} className={styles.fila}>
          <img src={img} alt={`Matriz ${i+1}`} className={styles.imagen} />

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
