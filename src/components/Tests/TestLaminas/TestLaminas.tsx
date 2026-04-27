import { useState } from "react";
import TestBender from "../TestBender/TestBender";
import TestZulliger from "../TestZulliger/TestZulliger";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestLaminas.module.css";
import relojStyle from "../helpers/countdown.module.css";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import { useTestEngine } from "../helpers/useTestEngine";
import { LAMINAS_TEST } from "../../../data/tests/LAMINAS_TEST";
import CapturaAutomatica from "../../../services/cameraService";

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number;
};

export default function TestLaminas({ onFinish, userId }: Props) {
  const [zulliger, setZulliger] = useState<any[]>([]);
  const [bender, setBender] = useState<any[]>([]);
  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const zulligerCompleto = zulliger.some((r) => r && r !== "");
  const benderCompleto = bender.some((r) => r && r !== "");
  const [captura, setCaptura] = useState<{
  url: string;
  public_id: string;
} | null>(null);
const [cameraOn, setCameraOn] = useState(false);

  const puedeFinalizar = zulligerCompleto && benderCompleto;

  const totalPreguntas = LAMINAS_TEST.preguntas.length;
  const respuestasMapeadas = [...zulliger, ...bender];

  const engine = useTestEngine({
    userId,
    testId: "laminas",
    timeLimitMs: 30 * 60 * 1000,
    onFinish,
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;

  let timerClass = styles.timer;
  if (tiempoRestante < 60) timerClass += ` ${styles.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${styles.warning}`;

const iniciarTest = () => {
  setCameraOn(true);
  engine.start();
};
const esperarCaptura = async () => {
  let intentos = 0;

  while (!captura?.url && intentos < 20) {
    await new Promise((r) => setTimeout(r, 200));
    intentos++;
  }

  return captura;
};
const finalizar = async () => {
  setEnviando(true);

   const respuestasFinales = [
    ...zulliger.map((r, i) => ({
      pregunta: `Zulliger ${i + 1}`,
      respuesta: r?.texto || r || "Sin respuesta",
    })),
    ...bender.map((r, i) => ({
      pregunta: `Bender ${i + 1}`,
      respuesta: r?.texto || r || "Sin respuesta",
    })),
  ];

  const capturaFinal = await esperarCaptura();

  // 🔥 APAGÁS cámara después de capturar
  setCameraOn(false);

  engine.submit({
    respuestas: respuestasFinales,
    archivoCaptura: capturaFinal?.url || null,
    captura_public_id: capturaFinal?.public_id || null,
  });

  setEnviando(false);
};

  if (!engine.started) {
    return (
      <Modal abierto onCerrar={() => {}} titulo="Evaluación">
        <ConsentimientoCamara changeStatus={setCanStart} />

        <BotonPersonalizado
          variant="primary"
          disabled={!canStart}
          onClick={iniciarTest}
        >
          Comenzar
        </BotonPersonalizado>
      </Modal>
    );
  }

  return (
    <div className={`scrollbar ${styles.container}`}>
      <div className="layout">
        <div className="panelVertical">
          <div className={`card padding ${styles.cardPaciente}`}>
            <aside className={styles.sidebar}>
              <h3>Tiempo disponible:</h3>

              <div className={relojStyle.timer}>
                {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
              </div>

              <h3>Preguntas:</h3>

              <div className={relojStyle.progressContainer}>
                {Array.from({ length: totalPreguntas }).map((_, i) => {
                  const r = respuestasMapeadas[i];
                  const respondida = !!r && r !== "Sin respuesta";

                  return (
                    <button
                      key={i}
                      disabled={respondida}
                      className={`${relojStyle.progressItem} ${
                        respondida ? relojStyle.completa : relojStyle.pendiente
                      }`}
                    >
                      {i + 1}
                    </button>
                  );
                })}
              </div>
            </aside>
          </div>
{cameraOn && (
  <CapturaAutomatica
    pacienteId={userId}
    onCapturaTerminada={(data) => setCaptura(data)}
  />
)}
        </div>

        <div className="width-complete">
          <main className={`card padding ${styles.container}`}>
            <h2>Evaluación con Láminas</h2>

            <div className="container">
              <TestZulliger onChange={(r) => setZulliger(r)} />
            </div>

            <div className="container">
              <TestBender onChange={(r) => setBender(r)} />
            </div>

            <BotonPersonalizado
              className="margin padding"
              onClick={finalizar}
              disabled={enviando || !puedeFinalizar}
              variant="primary"
            >
              {enviando ? "Guardando..." : "Finalizar evaluación completa"}
            </BotonPersonalizado>
          </main>
        </div>
      </div>
    </div>
  );
}
