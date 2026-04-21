import { useRef, useState, useEffect } from "react";
import TestBender from "../TestBender/TestBender";
import TestZulliger from "../TestZulliger/TestZulliger";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestLaminas.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import { iniciarMonitoreo } from "../../../services/cameraService.tsx"; 

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number; // ID necesario para el monitoreo
};

export default function TestLaminas({ onFinish, userId }: Props) {
  const [zulliger, setZulliger] = useState<any>(null);
  const [bender, setBender] = useState<any>(null);
  const [canStart, setCanStart] = useState(false);

  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0);
  
  // Referencia para la función de apagado de cámara
  const stopCameraRef = useRef<(() => void) | null>(null);

  // Limpieza automática si el usuario sale de la página
  useEffect(() => {
    return () => {
      if (stopCameraRef.current) {
        stopCameraRef.current();
      }
    };
  }, []);

  const iniciarTest = async () => {
    // Iniciamos la cámara antes de entrar al test
    const cleanup = await iniciarMonitoreo(userId);
    if (cleanup) {
      stopCameraRef.current = cleanup;
    }

    setTestIniciado(true);
    startTimeRef.current = Date.now();
  };

  const calcularResultado = () => {
    if (!testIniciado) return;

    // Apagamos la cámara al finalizar la evaluación completa
    if (stopCameraRef.current) {
      stopCameraRef.current();
      stopCameraRef.current = null;
    }

    const endTime = Date.now();
    const tiempoTotalMs = endTime - startTimeRef.current;

    const normalizar = (arr: any[], tipo: string) =>
      arr.map((r: any, i: number) => ({
        pregunta: `${tipo} ${i + 1}`,
        respuesta:
          typeof r === "string"
            ? r
            : r?.texto || r?.respuesta || "Sin respuesta",
      }));

    const respuestasFinales = [
      ...normalizar(zulliger || [], "Zulliger"),
      ...normalizar(bender || [], "Bender"),
    ];

    onFinish({
      score: null,
      nivel: "Interpretación de Láminas",
      respuestas: respuestasFinales,
      metodo: "Test Laminas",
      tiempoTotalMs,
    });
  };

  if (!testIniciado) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación con Láminas"
      >
        <div style={{ marginBottom: "15px" }}>
          <li>
            Esta evaluación <strong>monitoriza el tiempo</strong> y realiza capturas de identidad aleatorias.
          </li>
          <li>
            <strong>Importante:</strong> El tiempo empleado <strong>no afectará</strong> a su puntuación final.
          </li>
          <li style={{marginTop: "1rem"}}>
            Responda con total <strong>sinceridad</strong>. Al finalizar ambas partes, haga clic en <strong>«Finalizar evaluación completa»</strong>.
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

  return (
    <div className={styles.container}>
      <h2>Evaluación con Láminas</h2>
      <TestZulliger onFinish={(res) => setZulliger(res.respuestas)} />
      <TestBender onFinish={(res) => setBender(res.respuestas)} />

      <BotonPersonalizado 
        className={styles.boton} 
        onClick={calcularResultado} 
        disabled={!zulliger || !bender} 
        variant="primary"
      >
        Finalizar evaluación completa
      </BotonPersonalizado>
    </div>
  );
}
