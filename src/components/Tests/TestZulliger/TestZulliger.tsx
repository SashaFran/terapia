import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";

import RotatableImage from "./RotatableImage";
import BotonPersonalizado from "../../Boton/Boton";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestProgress from "../helpers/TestProgress";

import styles from "./TestZulliger.module.css";
import relojStyle from "../helpers/countdown.module.css";

import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish: (resultado: any) => void | Promise<void>;
  userId: string | number;
};

export default function TestZulliger({
  onFinish,
  userId,
}: Props) {
  const navigate = useNavigate();

  const [canStart, setCanStart] =
    useState(false);

  const [respuestas, setRespuestas] =
    useState<string[]>(
      Array(
        ZULLIGER_TEST.imagenes.length,
      ).fill(""),
    );

  const [enviando, setEnviando] =
    useState(false);

  const engine = useTestEngine({
    userId,

    testId: "zulliger",

    timeLimitMs:
      30 * 60 * 1000,

    onFinish: async (data) => {
      await onFinish(data);

      navigate(
        "/app/tests",
        {
          replace: true,
        },
      );
    },
  });

  const tiempoRestante =
    engine.minutes * 60 +
    engine.seconds;

  let timerClass =
    relojStyle.timer;

  if (tiempoRestante < 60) {
    timerClass +=
      ` ${relojStyle.danger}`;
  } else if (
    tiempoRestante < 300
  ) {
    timerClass +=
      ` ${relojStyle.warning}`;
  }

  const handleChange = (
    index: number,
    texto: string,
  ) => {
    const copy = [
      ...respuestas,
    ];

    copy[index] = texto;

    setRespuestas(copy);

    engine.update({
      respuestas: copy,
    });
  };

  const finalizar = async () => {
    if (
      !engine.started ||
      enviando
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit({
        respuestas,

        nivel:
          "Interpretación Láminas",

        metodo: "Zulliger",
      });
    } catch (error) {
      console.error(
        "Error al finalizar:",
        error,
      );

      setEnviando(false);
    }
  };

  /*
   * Una lámina se considera respondida
   * cuando contiene texto real.
   */
  const completadas =
    respuestas.map(
      (respuesta) =>
        respuesta.trim().length > 0,
    );

  const cantidadCompletadas =
    completadas.filter(Boolean).length;

  const totalLaminas =
    ZULLIGER_TEST.imagenes.length;

  /* =======================================================
     INTRODUCCIÓN
  ======================================================= */

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Test Zulliger"
        descripcion="Evaluación mediante interpretación de láminas"
        duracion="30 minutos"
        canStart={canStart}
        onConsentChange={
          setCanStart
        }
        onStart={
          engine.start
        }
        instrucciones={[
          {
            titulo:
              "Observe cada lámina",

            texto: (
              <p>
                Durante la evaluación
                se presentarán distintas
                láminas. Obsérvelas con
                atención antes de
                responder.
              </p>
            ),
          },
          {
            titulo:
              "Describa su percepción",

            texto: (
              <p>
                Para cada lámina,
                escriba qué ve, qué
                interpreta y qué siente
                o piensa al observarla.
                No es necesario buscar
                una respuesta específica.
              </p>
            ),
          },
          {
            titulo:
              "Responda con tranquilidad",

            texto: (
              <p>
                Utilice sus propias
                palabras y procure
                describir su percepción
                de la forma más clara
                posible.
              </p>
            ),
          },
        ]}
      />
    );
  }

  /* =======================================================
     TEST
  ======================================================= */

  return (
    <main className={styles.page}>
      {engine.feedback}

      {/* =========================
          HEADER
      ========================= */}

      <header
        className={styles.testHeader}
      >
        <div>
          <span
            className={styles.eyebrow}
          >
            Evaluación en curso
          </span>

          <h1>
            {ZULLIGER_TEST.nombre}
          </h1>

          <p>
            Observe cada lámina y
            escriba su percepción en
            el campo correspondiente.
          </p>
        </div>

        <div
          className={styles.timeBlock}
        >
          <span>
            Tiempo restante
          </span>

          <div
            className={timerClass}
          >
            {engine.minutes}:
            {String(
              engine.seconds,
            ).padStart(2, "0")}
          </div>
        </div>
      </header>

      {engine.CameraComponent && (
        <engine.CameraComponent />
      )}

      {/* =========================
          WORKSPACE
      ========================= */}

      <div
        className={styles.workspace}
      >
        <div
          className={styles.sidebar}
        >
          <TestProgress
            total={totalLaminas}
            completadas={completadas}
            titulo="Láminas"
            itemLabel="Lámina"
          />
        </div>

        <section
          className={
            styles.testContent
          }
        >
          {ZULLIGER_TEST.imagenes.map(
            (img, i) => (
              <article
                id={`test-item-${i}`}
                key={i}
                className={`${styles.laminaCard} ${
                  completadas[i]
                    ? styles.laminaCompleted
                    : ""
                }`}
              >
                {/* HEADER LÁMINA */}

                <header
                  className={
                    styles.laminaHeader
                  }
                >
                  <div>
                    <span
                      className={
                        styles.laminaEyebrow
                      }
                    >
                      Lámina{" "}
                      {String(
                        i + 1,
                      ).padStart(
                        2,
                        "0",
                      )}{" "}
                      · de{" "}
                      {String(
                        totalLaminas,
                      ).padStart(
                        2,
                        "0",
                      )}
                    </span>

                    <h2>
                      Observe la imagen
                      con atención
                    </h2>
                  </div>

                  <span
                    className={`${styles.status} ${
                      completadas[i]
                        ? styles.statusCompleted
                        : styles.statusPending
                    }`}
                    title={
                      completadas[i]
                        ? "Esta lámina ya tiene una respuesta"
                        : "Esta lámina todavía no fue respondida"
                    }
                  >
                    <span />

                    {completadas[i]
                      ? "Respondida"
                      : "Pendiente"}
                  </span>
                </header>

                {/* IMAGEN */}

                <div
                  className={
                    styles.imageArea
                  }
                >
                  <RotatableImage
                    src={img}
                  />
                </div>

                {/* RESPUESTA */}

                <div
                  className={
                    styles.answerArea
                  }
                >
                  <div
                    className={
                      styles.answerHeader
                    }
                  >
                    <label
                      htmlFor={`respuesta-${i}`}
                    >
                      Su respuesta
                    </label>

                    <span>
                      {
                        respuestas[i]
                          .length
                      }{" "}
                      caracteres
                    </span>
                  </div>

                  <textarea
                    id={`respuesta-${i}`}
                    disabled={
                      engine.inputLocked
                    }
                    placeholder="¿Qué ve en esta lámina? ¿Qué siente o piensa al observarla?"
                    value={
                      respuestas[i]
                    }
                    onChange={(e) =>
                      handleChange(
                        i,
                        e.target.value,
                      )
                    }
                    className={
                      styles.textarea
                    }
                  />
                </div>
              </article>
            ),
          )}

          {/* =========================
              FINALIZAR
          ========================= */}

          <footer
            className={
              styles.finishCard
            }
          >
            <div>
              <span
                className={
                  styles.finishEyebrow
                }
              >
                Progreso
              </span>

              <strong>
                {
                  cantidadCompletadas
                }{" "}
                de {totalLaminas}{" "}
                láminas respondidas
              </strong>

              <p>
                Revise sus respuestas
                antes de finalizar la
                evaluación.
              </p>
            </div>

            <div
              className={
                styles.finishAction
              }
            >
              <BotonPersonalizado
                onClick={finalizar}
                disabled={
                  enviando ||
                  engine.inputLocked
                }
                variant="primary"
              >
                {enviando
                  ? "Enviando..."
                  : "Finalizar Test"}
              </BotonPersonalizado>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}