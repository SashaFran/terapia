import { useRef, useState } from "react";
import TestBender from "../TestBender/TestBender";
import TestZulliger from "../TestZulliger/TestZulliger";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestLaminas.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import CapturaAutomatica from "../../../services/cameraService.tsx";
import { db } from "../../../firebase/firebase.tsx";
import { addDoc, collection } from "firebase/firestore";

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number;
};

export default function TestLaminas({ onFinish, userId }: Props) {
  const [zulliger, setZulliger] = useState<any>(null);
  const [bender, setBender] = useState<any>(null);
  const [canStart, setCanStart] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);

  const [captura, setCaptura] = useState<{
    url: string;
    public_id: string;
  } | null>(null);

  const [testIniciado, setTestIniciado] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const startTimeRef = useRef<number>(0);

  const iniciarTest = () => {
    setTestIniciado(true);
    startTimeRef.current = Date.now();
    setCameraOn(true);
  };

  const esperarCaptura = async () => {
    let intentos = 0;

    while (!captura?.url && intentos < 20) {
      await new Promise((r) => setTimeout(r, 200));
      intentos++;
    }

    return captura;
  };

const calcularResultado = async () => {
  const pacienteStorage = localStorage.getItem("paciente");
  const paciente = pacienteStorage ? JSON.parse(pacienteStorage) : null;

  const realUserId = paciente?.id || userId;

  if (!realUserId) {
    console.error("❌ userId inválido");
    return;
  }

  setCameraOn(false);

  const endTime = Date.now();
  const tiempoTotalMs = endTime - startTimeRef.current;

  const normalizar = (arr: any[], tipo: string) =>
    arr.map((r: any, i: number) => ({
      pregunta: `${tipo} ${i + 1}`,
      respuesta: typeof r === "string" ? r : r?.texto || r?.respuesta || "Sin respuesta",
    }));

  const respuestasFinales = [
    ...normalizar(zulliger || [], "Zulliger"),
    ...normalizar(bender || [], "Bender"),
  ];

  const resultado = {
    score: null,
    nivel: "Interpretación de Láminas",
    respuestas: respuestasFinales,
    metodo: "Test Laminas",
    tiempoTotalMs,
    archivoCaptura: captura?.url || null,
    captura_public_id: captura?.public_id || null,
  };

  try {
    await addDoc(collection(db, "resultados"), {
      pacienteId: String(realUserId),
      testId: "laminas",
      ...resultado,
      fecha: new Date(),
    });

    onFinish(resultado);
  } catch (err) {
    console.error("❌ Error guardando resultado:", err);
  }
};

  if (!testIniciado) {
    return (
      <Modal
        abierto={true}
        onCerrar={() => {}}
        titulo="Instrucciones para la Evaluación con Láminas"
      >
        <div className="nav">
          <div>
            <li>Esta evaluación monitoriza el tiempo.</li>
            <li>El tiempo no afecta el resultado.</li>
            <li>Respondé con sinceridad.</li>
          </div>
        </div>

        <ConsentimientoCamara changeStatus={setCanStart} />

        <div style={{ display: "flex", justifyContent: "center", marginTop: 20 }}>
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
    <div className={`container scrollbar ${styles.container}`}>
      <h2>Evaluación con Láminas</h2>

      <TestZulliger onFinish={(res) => setZulliger(res.respuestas)} />
      <TestBender onFinish={(res) => setBender(res.respuestas)} />

      {cameraOn && (
        <CapturaAutomatica
          pacienteId={userId}
          onCapturaTerminada={(data) => setCaptura(data)}
        />
      )}

      <BotonPersonalizado
        className={styles.boton}
        onClick={calcularResultado}
        disabled={!zulliger || !bender || enviando}
        variant="primary"
      >
        {enviando ? "Guardando..." : "Finalizar evaluación completa"}
      </BotonPersonalizado>
    </div>
  );
}