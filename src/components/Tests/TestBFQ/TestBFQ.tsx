import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BFQ_TEST } from "../../../data/tests/BFQ_TEST";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "../TestK10/Testk10.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import { iniciarMonitoreo } from "../../../services/cameraService.tsx"; 

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
    Array(BFQ_TEST.preguntas.length).fill(0)
  );

  const [testIniciado, setTestIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const startTimeRef = useRef<number>(0);
  
  // Referencia para la función de apagado de cámara
  const stopCameraRef = useRef<(() => void) | null>(null);

  // Limpieza automática si el usuario sale de la página o cierra la pestaña
  useEffect(() => {
    return () => {
      if (stopCameraRef.current) {
        stopCameraRef.current();
      }
    };
  }, []);

  const iniciarTest = async () => {
    // Iniciamos la cámara antes de mostrar las preguntas
    const cleanup = await iniciarMonitoreo(userId);
    if (cleanup) {
      stopCameraRef.current = cleanup;
    }

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
    if (!testIniciado || enviando) return;

    setEnviando(true);

    // Apagamos la cámara apenas se presiona finalizar
    if (stopCameraRef.current) {
      stopCameraRef.current();
      stopCameraRef.current = null;
    }

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;

    const resultado = {
      extraversion: calcularDimension(dimensionesMap.extraversion),
      amabilidad: calcularDimension(dimensionesMap.amabilidad),
      responsabilidad: calcularDimension(dimensionesMap.responsabilidad),
      neuroticismo: calcularDimension(dimensionesMap.neuroticismo),
      apertura: calcularDimension(dimensionesMap.apertura),
    };

    try {
      await onFinish({
        dimensiones: resultado,
        respuestas,
        metodo: "BFQ",
        tiempoTotalMs,
      });

      navigate('/dashboard', { replace: true }); 

    } catch (error) {
      console.error("Error al finalizar:", error);
      setEnviando(false);
    }
  };

  const incompleto = respuestas.some((r) => r === 0);

  if (!testIniciado) {
    return (
      <Modal abierto={true} onCerrar={() => {}} titulo="Instrucciones - Test BFQ">
        <div style={{ marginBottom: '15px' }}>
          <li>Esta evaluación mide diferentes dimensiones de la personalidad.</li>
          <li>Responda con sinceridad. No hay respuestas correctas o incorrectas.</li>
          <li>Durante el test, se realizarán capturas aleatorias para validar su identidad.</li>
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

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>{BFQ_TEST.nombre}</h2>
      </div>

      <div className={styles.testContainer}>
        {BFQ_TEST.preguntas.map((pregunta, i) => (
          <div key={i} className={styles.testCard}>
            <p><strong>{i + 1}.</strong> {pregunta}</p>
            <div className={styles.testCardItems}>
              {BFQ_TEST.opciones.map((op) => (
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
