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
import { textAlign } from "@mui/system";

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

const iniciarTest = () => engine.start();
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

  await engine.submit({
    respuestas: respuestasFinales,
    metodo: "Laminas",
    nivel: "Interpretación Láminas",
  });

  setEnviando(false);
};

  if (!engine.started) {
    return (
      <Modal abierto onCerrar={() => {}} titulo="">
     <div>
          <strong>Bienvenido/a.</strong>{" "}
          <p>
            {" "}
            Antes de comenzar, por favor lea atentamente las siguientes
            indicaciones para asegurar un resultado preciso:
          </p>
          <ol>
            <li>
              <strong>El objetivo:</strong>
              <li>
                Se le presentará una serie de láminas con manchas de tinta o imágenes. Su tarea es observar cada una y escribir (o decir) qué ve en ellas, qué se imagina que podrían ser o qué le parecen.
              </li>
            </li>
            <li>
              <strong>Cómo responder:</strong>
              <li>
                Mire atentamente la imagen y analice las figuras (puede manipularlas con ayuda del ratón). Sea lo más descriptivo posible.
Puede ver una o varias cosas en una misma lámina. No hay respuestas correctas o incorrectas, lo importante es su percepción e interpretación personal de cada imagen.
              </li>
            </li>
          </ol>
          <li className="padding">
            Tiene <strong>30 minutos</strong> para completar el test y se
            realizarán capturas a traves de la camara para verificar su
            identidad.
            <br />
            <strong>Importante:</strong> Es necesario que acepte o no podra ser
            evaluado.
          </li>
        </div>
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
          <h2 style={{ textAlign: "center" }}>Evaluación con Láminas</h2>
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
          {engine.CameraComponent && <engine.CameraComponent />}
        </div>

        <div className="width-complete">
          <main className={`card padding ${styles.container}`}>
            

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