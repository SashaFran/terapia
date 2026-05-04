import { useState } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../../Modal/Modal";
import styles from "./TestRaven.module.css";
import { RAVEN_TEST } from "../../../data/tests/raven_test";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";
import relojStyle from "../helpers/countdown.module.css";
import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish: (resultado: any) => void;
  userId: string | number; // Prop necesaria para las fotos
};

const RESPUESTAS_CORRECTAS = [1, 7, 8, 5, 5, 7, 6, 8, 1, 1, 6, 3];

export default function TestRaven({ onFinish, userId }: Props) {
  const [canStart, setCanStart] = useState(false);
  const totalPreguntas = RAVEN_TEST.imagenes.length;
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(RAVEN_TEST.imagenes.length).fill(""),
  );

  const engine = useTestEngine({
    userId,
    testId: "raven",
    timeLimitMs: 30 * 60 * 1000,
    onFinish,
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;
  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;

  // ----------------------
  // INICIO TEST
  // ----------------------
  const iniciarTest = () => engine.start();

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

    engine.submit({
      score: 12 - errores,
      errores,
      nivel,
      respuestas: respuestas.map((r, i) => ({
        pregunta: `Matriz ${i + 1}`,
        respuesta: r || "Sin respuesta",
      })),
      metodo: "Test Raven",
    });
  };

  // ----------------------
  // MODAL INICIAL
  // ----------------------
  if (!engine.started) {
    return (
      <Modal abierto={true} onCerrar={() => {}} titulo="">
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
                En cada pantalla verá una imagen principal (matriz) a la cual le
                falta una parte. Debajo de ella, encontrará varias opciones de
                respuesta. Su tarea es identificar cuál de esas piezas completa
                lógicamente el patrón de la imagen principal, tanto en su forma
                como en su dibujo interno.
              </li>
            </li>
            <li>
              <strong>Cómo responder:</strong>
              <li>
                Mire atentamente la imagen y analice cómo cambian las figuras
                tanto de forma horizontal como vertical. Haga clic sobre la
                opción que considere correcta para avanzar a la siguiente
                lámina. Solo hay una respuesta correcta para cada ejercicio.
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

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
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
    <div className={`scrollbar ${styles.container}`}>
      <div className="layout">
        <div className="panelVertical">
          <h2>Evaluación de Raven</h2>
          <div className={`card padding ${styles.cardPaciente}`}>
            
            <aside className={styles.sidebar}>
              <h3>Tiempo disponible:</h3>

              <div className={relojStyle.timer}>
                {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
              </div>

              <h3>Preguntas:</h3>

              <div className={relojStyle.progressContainer}>
                {Array.from({ length: totalPreguntas }).map((_, i) => {
                  const r = respuestas[i];
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
        </div>
        {engine.CameraComponent && <engine.CameraComponent />}
        <main className={styles.container}>
          
          <div className="container">
            {RAVEN_TEST.imagenes.map((img: string, i: number) => (
              <div key={i} className={`card padding ${styles.testCard}`}>
                <img
                  src={img}
                  alt={`Matriz ${i + 1}`}
                  className={styles.imagen}
                />

                <input
                  type="text"
                  value={respuestas[i]}
                  onChange={(e) => handleChange(i, e.target.value)}
                  placeholder="Respuesta"
                  className={styles.input}
                />
              </div>
            ))}
          </div>

          <BotonPersonalizado
            className={styles.boton}
            onClick={finalizar}
            disabled={respuestas.some((r) => r === "")}
            variant="primary"
          >
            Finalizar test
          </BotonPersonalizado>
        </main>
      </div>
    </div>
  );
}
