import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { K10_TEST } from "../../../data/tests/k10";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal.tsx";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal.tsx";
import { iniciarMonitoreo } from "../../../services/cameraService.tsx"; 

type ResultadoK10 = {
  score: number;
  nivel: string;
  respuestas: number[];
  metodo: string;
  tiempoTotalMs: number;
};

type Props = {
  onFinish: (resultado: ResultadoK10) => void | Promise<void>;
  userId: string | number; // Necesario para identificar las fotos
};

export default function TestK10({ onFinish, userId }: Props) {
  const navigate = useNavigate();
  const [canStart, setCanStart] = useState(false);
  const [respuestas, setRespuestas] = useState<number[]>(
    Array(K10_TEST.preguntas.length).fill(0),
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const startTimeRef = useRef<number>(0);
  
  // Referencia para guardar la función que apaga la cámara
  const stopCameraRef = useRef<(() => void) | null>(null);

  // Efecto para limpiar la cámara cuando el componente se destruye (ej: cerrar pestaña o navegar)
  useEffect(() => {
    return () => {
      if (stopCameraRef.current) {
        stopCameraRef.current();
      }
    };
  }, []);

  const iniciarTest = async () => {
    // 1. Iniciamos el monitoreo (cámara)
    const cleanup = await iniciarMonitoreo(userId);
    if (cleanup) {
      stopCameraRef.current = cleanup;
    }

    // 2. Iniciamos estados visuales y tiempo
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

  const calcularResultado = async () => {
    if (!testIniciado || enviando) return;

    setEnviando(true);

    // Apagamos la cámara apenas termina el test
    if (stopCameraRef.current) {
      stopCameraRef.current();
      stopCameraRef.current = null;
    }

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;
    const total = respuestas.reduce((a, b) => a + b, 0);

    let nivel = "";
    if (total <= 12) nivel = "Malestar psicológico bajo o moderado";
    else if (total <= 19) nivel = "Malestar psicológico moderado a severo";
    else if (total <= 29) nivel = "Malestar psicológico severo";
    else nivel = "Malestar psicológico muy severo";

    try {
      await onFinish({
        score: total,
        nivel,
        respuestas,
        metodo: "K10 - método 1",
        tiempoTotalMs: tiempoTotalMs,
      });

      navigate('/app/dashboard', { replace: true });
    } catch (error) {
      console.error("Error al guardar el K10:", error);
      setEnviando(false);
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
        <div style={{ marginBottom: '15px' }}>
          <li>
            Esta evaluación <strong>monitoriza el tiempo</strong> que se tarda en
            completarse, con fines exclusivamente estadísticos.
          </li>
          <li>
            <strong>Importante:</strong> El tiempo empleado <strong>no afectará</strong> a su puntuación final.
          </li>
          <li>
            Por favor, responda con total <strong>sinceridad</strong>.
          </li>
        </div>

        {/* Componente de aviso legal con checkbox */}
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

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>{K10_TEST.nombre}</h2>
      </div>
      
      <div className={styles.testContainer}>
        {K10_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p><strong>{i + 1}.</strong> {pregunta}</p>
            <div className={styles.testCardItems}>
              {K10_TEST.opciones.map((op) => (
                <label key={op.valor} style={{ display: "flex", alignItems: "center", cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name={`pregunta-${i}`}
                    checked={respuestas[i] === op.valor}
                    onChange={() => responder(i, op.valor)}
                    style={{ marginRight: '8px' }}
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
