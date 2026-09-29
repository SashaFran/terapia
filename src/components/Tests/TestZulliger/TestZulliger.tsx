import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";

import BotonPersonalizado from "../../Boton/Boton";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestProgress from "../helpers/TestProgress";

import styles from "./TestZulliger.module.css";
import relojStyle from "../helpers/countdown.module.css";

import { useTestEngine } from "../helpers/useTestEngine";

/* =========================================================
   TYPES
========================================================= */

type Rotacion = 0 | 90 | 180 | 270;

type RespuestaOrientacion = {
  rotacion: Rotacion;
  respuesta: string;
};

type RespuestaLamina = {
  lamina: number;
  orientaciones: RespuestaOrientacion[];
};

type Props = {
  onFinish: (resultado: any) => void | Promise<void>;
  userId: string | number;
};

/* =========================================================
   CONSTANTS
========================================================= */

const ROTACIONES: Rotacion[] = [0, 90, 180, 270];

const crearRespuestasIniciales = (): RespuestaLamina[] =>
  ZULLIGER_TEST.imagenes.map((_, index) => ({
    lamina: index + 1,

    orientaciones: ROTACIONES.map((rotacion) => ({
      rotacion,
      respuesta: "",
    })),
  }));

/* =========================================================
   COMPONENT
========================================================= */

export default function TestZulliger({
  onFinish,
  userId,
}: Props) {
  const navigate = useNavigate();

  const [canStart, setCanStart] = useState(false);

  const [respuestas, setRespuestas] =
    useState<RespuestaLamina[]>(
      crearRespuestasIniciales,
    );

  /*
   * Guarda qué orientación está viendo actualmente
   * el paciente para cada lámina.
   *
   * Ejemplo:
   * [0, 2, 1]
   *
   * Lámina 1 -> orientación 0°
   * Lámina 2 -> orientación 180°
   * Lámina 3 -> orientación 90°
   */
  const [slidesActivos, setSlidesActivos] = useState<number[]>(
    () =>
      Array(ZULLIGER_TEST.imagenes.length).fill(0),
  );

  const [enviando, setEnviando] = useState(false);

  /* =======================================================
     ENGINE
  ======================================================= */

  const engine = useTestEngine({
    userId,

    testId: "zulliger",

    timeLimitMs: 30 * 60 * 1000,

    onFinish: async (data) => {
      await onFinish(data);

      navigate("/app/tests", {
        replace: true,
      });
    },
  });

  /* =======================================================
     TIMER
  ======================================================= */

  const tiempoRestante =
    engine.minutes * 60 +
    engine.seconds;

  let timerClass =
    relojStyle.timer;

  if (tiempoRestante < 60) {
    timerClass +=
      ` ${relojStyle.danger}`;
  } else if (tiempoRestante < 300) {
    timerClass +=
      ` ${relojStyle.warning}`;
  }

  /* =======================================================
     RESPUESTAS
  ======================================================= */

  const handleChange = (
    laminaIndex: number,
    orientacionIndex: number,
    texto: string,
  ) => {
    const nuevasRespuestas =
      respuestas.map(
        (lamina, index) => {
          if (index !== laminaIndex) {
            return lamina;
          }

          return {
            ...lamina,

            orientaciones:
              lamina.orientaciones.map(
                (orientacion, indexOrientacion) => {
                  if (
                    indexOrientacion !==
                    orientacionIndex
                  ) {
                    return orientacion;
                  }

                  return {
                    ...orientacion,
                    respuesta: texto,
                  };
                },
              ),
          };
        },
      );

    setRespuestas(nuevasRespuestas);

    /*
     * Guardamos la estructura completa.
     *
     * Esto permite identificar:
     * - qué lámina es,
     * - qué orientación tiene,
     * - qué respondió el paciente.
     */
    engine.update({
      respuestas: nuevasRespuestas,
    });
  };

  /* =======================================================
     CAROUSEL
  ======================================================= */

  const cambiarSlide = (
    laminaIndex: number,
    nuevoSlide: number,
  ) => {
    setSlidesActivos((prev) => {
      const copia = [...prev];

      copia[laminaIndex] = nuevoSlide;

      return copia;
    });
  };

  const slideAnterior = (
    laminaIndex: number,
  ) => {
    const actual =
      slidesActivos[laminaIndex];

    const nuevo =
      actual === 0
        ? ROTACIONES.length - 1
        : actual - 1;

    cambiarSlide(
      laminaIndex,
      nuevo,
    );
  };

  const slideSiguiente = (
    laminaIndex: number,
  ) => {
    const actual =
      slidesActivos[laminaIndex];

    const nuevo =
      actual === ROTACIONES.length - 1
        ? 0
        : actual + 1;

    cambiarSlide(
      laminaIndex,
      nuevo,
    );
  };

  /* =======================================================
     PROGRESO
  ======================================================= */

  /*
   * Una orientación está respondida solamente
   * cuando contiene texto real.
   */
  const orientacionRespondida = (
    laminaIndex: number,
    orientacionIndex: number,
  ) =>
    respuestas[laminaIndex]
      .orientaciones[orientacionIndex]
      .respuesta
      .trim()
      .length > 0;

  const cantidadOrientacionesRespondidas = (
    laminaIndex: number,
  ) =>
    respuestas[laminaIndex]
      .orientaciones
      .filter(
        (orientacion) =>
          orientacion.respuesta
            .trim()
            .length > 0,
      )
      .length;

  /*
   * La lámina se considera COMPLETA únicamente
   * cuando sus cuatro orientaciones tienen respuesta.
   */
  const completadas =
    respuestas.map(
      (lamina) =>
        lamina.orientaciones.every(
          (orientacion) =>
            orientacion.respuesta
              .trim()
              .length > 0,
        ),
    );

  const cantidadCompletadas =
    completadas.filter(Boolean).length;

  const totalLaminas =
    ZULLIGER_TEST.imagenes.length;

  const totalOrientaciones =
    totalLaminas *
    ROTACIONES.length;

  const orientacionesCompletadas =
    respuestas.reduce(
      (total, lamina) =>
        total +
        lamina.orientaciones.filter(
          (orientacion) =>
            orientacion.respuesta
              .trim()
              .length > 0,
        ).length,
      0,
    );

  const testCompleto =
    orientacionesCompletadas ===
    totalOrientaciones;

  /* =======================================================
     FINALIZAR
  ======================================================= */

  const finalizar = async () => {
    if (
      !engine.started ||
      enviando ||
      engine.inputLocked ||
      !testCompleto
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit({
        /*
         * Estructura preparada para persistencia y PDF:
         *
         * respuestas: [
         *   {
         *     lamina: 1,
         *     orientaciones: [
         *       {
         *         rotacion: 0,
         *         respuesta: "..."
         *       },
         *       ...
         *     ]
         *   }
         * ]
         */
        respuestas,

        nivel:
          "Interpretación Láminas",

        metodo: "Zulliger",

        totalLaminas,

        orientacionesPorLamina:
          ROTACIONES.length,

        totalRespuestas:
          orientacionesCompletadas,
      });
    } catch (error) {
      console.error(
        "Error al finalizar:",
        error,
      );

      setEnviando(false);
    }
  };

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
                Durante la evaluación se
                presentarán distintas
                láminas. Cada una podrá
                observarse en cuatro
                orientaciones diferentes.
              </p>
            ),
          },

          {
            titulo:
              "Observe las cuatro orientaciones",

            texto: (
              <p>
                Utilice las flechas del
                carrusel para observar cada
                lámina en 0°, 90°, 180° y
                270°. Cada orientación tiene
                su propio campo de respuesta.
              </p>
            ),
          },

          {
            titulo:
              "Describa su percepción",

            texto: (
              <p>
                Para cada orientación,
                escriba qué ve, qué
                interpreta y qué siente o
                piensa al observarla. No es
                necesario buscar una
                respuesta específica.
              </p>
            ),
          },

          {
            titulo:
              "Responda con tranquilidad",

            texto: (
              <p>
                Utilice sus propias palabras
                y procure describir su
                percepción de la forma más
                clara posible.
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

      {/* ===================================================
          HEADER
      =================================================== */}

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
            Observe cada lámina en sus
            cuatro orientaciones y escriba
            qué percibe en cada una.
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

      {/* ===================================================
          CAMERA
      =================================================== */}

      {engine.CameraComponent && (
        <engine.CameraComponent />
      )}

      {/* ===================================================
          WORKSPACE
      =================================================== */}

      <div
        className={styles.workspace}
      >
        {/* =================================================
            SIDEBAR
        ================================================= */}

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

        {/* =================================================
            CONTENT
        ================================================= */}

        <section
          className={
            styles.testContent
          }
        >
          {ZULLIGER_TEST.imagenes.map(
            (img, laminaIndex) => {
              const slideActual =
                slidesActivos[
                  laminaIndex
                ];

              const rotacion =
                ROTACIONES[
                  slideActual
                ];

              const respuestaActual =
                respuestas[
                  laminaIndex
                ].orientaciones[
                  slideActual
                ].respuesta;

              const respondidasLamina =
                cantidadOrientacionesRespondidas(
                  laminaIndex,
                );

              const estaCompleta =
                completadas[
                  laminaIndex
                ];

              return (
                <article
                  id={`test-item-${laminaIndex}`}
                  key={laminaIndex}
                  className={`${
                    styles.laminaCard
                  } ${
                    estaCompleta
                      ? styles.laminaCompleted
                      : ""
                  }`}
                >
                  {/* =======================================
                      HEADER LÁMINA
                  ======================================= */}

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
                          laminaIndex +
                            1,
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
                        desde cada
                        orientación
                      </h2>
                    </div>

                    <div
                      className={
                        styles.laminaProgress
                      }
                    >
                      <span
                        className={`${styles.status} ${
                          estaCompleta
                            ? styles.statusCompleted
                            : styles.statusPending
                        }`}
                        title={
                          estaCompleta
                            ? "Las cuatro orientaciones tienen respuesta"
                            : `${respondidasLamina} de 4 orientaciones respondidas`
                        }
                      >
                        <span />

                        {estaCompleta
                          ? "Completa"
                          : `${respondidasLamina}/4`}
                      </span>
                    </div>
                  </header>

                  {/* =======================================
                      ORIENTATION INFO
                  ======================================= */}

                  <div
                    className={
                      styles.orientationHeader
                    }
                  >
                    <div>
                      <span
                        className={
                          styles.orientationEyebrow
                        }
                      >
                        Orientación actual
                      </span>

                      <strong>
                        {rotacion}°
                      </strong>
                    </div>

                    <span
                      className={
                        styles.slideCounter
                      }
                    >
                      Vista{" "}
                      {slideActual + 1} de{" "}
                      {ROTACIONES.length}
                    </span>
                  </div>

                  {/* =======================================
                      CAROUSEL
                  ======================================= */}

                  <div
                    className={
                      styles.carousel
                    }
                  >
                    <button
                      type="button"
                      className={
                        styles.carouselArrow
                      }
                      onClick={() =>
                        slideAnterior(
                          laminaIndex,
                        )
                      }
                      disabled={
                        engine.inputLocked
                      }
                      aria-label={`Ver orientación anterior de la lámina ${
                        laminaIndex + 1
                      }`}
                    >
                      ‹
                    </button>

                    <div
                      className={
                        styles.imageArea
                      }
                    >
                      <div
                        className={
                          styles.imageFrame
                        }
                      >
                        <img
                          src={img}
                          alt={`Lámina ${
                            laminaIndex +
                            1
                          }, orientación ${rotacion} grados`}
                          style={{
                            transform: `rotate(${rotacion}deg)`,
                          }}
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        styles.carouselArrow
                      }
                      onClick={() =>
                        slideSiguiente(
                          laminaIndex,
                        )
                      }
                      disabled={
                        engine.inputLocked
                      }
                      aria-label={`Ver orientación siguiente de la lámina ${
                        laminaIndex + 1
                      }`}
                    >
                      ›
                    </button>
                  </div>

                  {/* =======================================
                      CAROUSEL DOTS / ORIENTATIONS
                  ======================================= */}

                  <div
                    className={
                      styles.orientationNav
                    }
                    aria-label={`Orientaciones de la lámina ${
                      laminaIndex + 1
                    }`}
                  >
                    {ROTACIONES.map(
                      (
                        angulo,
                        orientacionIndex,
                      ) => {
                        const activa =
                          orientacionIndex ===
                          slideActual;

                        const respondida =
                          orientacionRespondida(
                            laminaIndex,
                            orientacionIndex,
                          );

                        return (
                          <button
                            key={
                              angulo
                            }
                            type="button"
                            disabled={
                              engine.inputLocked
                            }
                            onClick={() =>
                              cambiarSlide(
                                laminaIndex,
                                orientacionIndex,
                              )
                            }
                            className={`${styles.orientationButton} ${
                              activa
                                ? styles.orientationButtonActive
                                : ""
                            } ${
                              respondida
                                ? styles.orientationButtonAnswered
                                : ""
                            }`}
                            aria-current={
                              activa
                                ? "true"
                                : undefined
                            }
                            title={
                              respondida
                                ? `Orientación ${angulo}° · Respondida`
                                : `Orientación ${angulo}° · Pendiente`
                            }
                          >
                            <span
                              className={
                                styles.orientationDot
                              }
                            />

                            <strong>
                              {angulo}°
                            </strong>

                            <small>
                              {respondida
                                ? "Respondida"
                                : "Pendiente"}
                            </small>
                          </button>
                        );
                      },
                    )}
                  </div>

                  {/* =======================================
                      ANSWER
                  ======================================= */}

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
                      <div>
                        <label
                          htmlFor={`respuesta-${laminaIndex}-${rotacion}`}
                        >
                          Respuesta ·
                          Lámina{" "}
                          {laminaIndex +
                            1}{" "}
                          · {rotacion}°
                        </label>

                        <p
                          className={
                            styles.answerHint
                          }
                        >
                          Describa qué ve,
                          siente o piensa al
                          observar esta
                          orientación.
                        </p>
                      </div>

                      <span>
                        {
                          respuestaActual.length
                        }{" "}
                        caracteres
                      </span>
                    </div>

                    <textarea
                      id={`respuesta-${laminaIndex}-${rotacion}`}
                      disabled={
                        engine.inputLocked
                      }
                      placeholder={`¿Qué ve en la Lámina ${
                        laminaIndex + 1
                      } observada a ${rotacion}°?`}
                      value={
                        respuestaActual
                      }
                      onChange={(e) =>
                        handleChange(
                          laminaIndex,
                          slideActual,
                          e.target.value,
                        )
                      }
                      className={
                        styles.textarea
                      }
                    />

                    <div
                      className={
                        styles.answerFooter
                      }
                    >
                      <span>
                        Lámina{" "}
                        {laminaIndex +
                          1}
                      </span>

                      <span
                        aria-hidden="true"
                      >
                        ·
                      </span>

                      <strong>
                        Orientación{" "}
                        {rotacion}°
                      </strong>

                      {orientacionRespondida(
                        laminaIndex,
                        slideActual,
                      ) && (
                        <>
                          <span
                            aria-hidden="true"
                          >
                            ·
                          </span>

                          <span
                            className={
                              styles.savedIndicator
                            }
                          >
                            <i />
                            Respondida
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </article>
              );
            },
          )}

          {/* =================================================
              FINALIZAR
          ================================================= */}

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
                  orientacionesCompletadas
                }{" "}
                de{" "}
                {
                  totalOrientaciones
                }{" "}
                respuestas completadas
              </strong>

              <p>
                Cada lámina debe tener
                respuesta en sus cuatro
                orientaciones antes de
                finalizar la evaluación.
              </p>

              <span
                className={
                  styles.finishSecondary
                }
              >
                {
                  cantidadCompletadas
                }{" "}
                de {totalLaminas}{" "}
                láminas completas
              </span>
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
                  engine.inputLocked ||
                  !testCompleto
                }
                variant="primary"
              >
                {enviando
                  ? "Enviando..."
                  : testCompleto
                    ? "Finalizar Test"
                    : `Faltan ${
                        totalOrientaciones -
                        orientacionesCompletadas
                      }`}
              </BotonPersonalizado>
            </div>
          </footer>
        </section>
      </div>
    </main>
  );
}