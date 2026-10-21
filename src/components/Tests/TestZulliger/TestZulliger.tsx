import { useState } from "react";
import { useNavigate } from "react-router-dom";
import TestNavigator from "../helpers/TestNavigator/TestNavigator";
import TestNavigationFooter from "../helpers/TestNavigationFooter/TestNavigationFooter";
import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";
import BotonPersonalizado from "../../Boton/Boton";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import { useTestEngine } from "../helpers/useTestEngine";

import styles from "./TestZulliger.module.css";
import relojStyle from "../helpers/countdown.module.css";

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

const ROTACIONES: Rotacion[] = [0, 90, 180, 270];

const crearRespuestasIniciales = (): RespuestaLamina[] =>
  ZULLIGER_TEST.imagenes.map((_, index) => ({
    lamina: index + 1,
    orientaciones: ROTACIONES.map((rotacion) => ({
      rotacion,
      respuesta: "",
    })),
  }));

export default function TestZulliger({ onFinish, userId }: Props) {
  const navigate = useNavigate();

  const totalLaminas = ZULLIGER_TEST.imagenes.length;
  const totalOrientaciones = totalLaminas * ROTACIONES.length;

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [respuestas, setRespuestas] = useState<RespuestaLamina[]>(
    crearRespuestasIniciales,
  );

  const [laminaActual, setLaminaActual] = useState(0);

  const [slidesActivos, setSlidesActivos] = useState<number[]>(() =>
    Array(totalLaminas).fill(0),
  );

  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(totalLaminas).fill(false);
    iniciales[0] = true;
    return iniciales;
  });

  const engine = useTestEngine({
    userId,
    testId: "zulliger",
    timeLimitMs: 30 * 60 * 1000,

    getResult: () => ({
      respuestas,
      laminaActual,
      visitadas,
      slidesActivos,
    }),

    onRestore: (data: any) => {
      if (Array.isArray(data.respuestas)) {
        const iniciales = crearRespuestasIniciales();

        setRespuestas(
          iniciales.map((lamina, i) => ({
            ...lamina,
            orientaciones: lamina.orientaciones.map((orientacion, j) => {
              const guardada = data.respuestas[i]?.orientaciones?.[j];

              return {
                ...orientacion,
                respuesta:
                  typeof guardada?.respuesta === "string"
                    ? guardada.respuesta
                    : "",
              };
            }),
          })),
        );
      }

      if (Number.isInteger(data.laminaActual)) {
        setLaminaActual(
          Math.max(0, Math.min(totalLaminas - 1, data.laminaActual)),
        );
      }

      if (Array.isArray(data.visitadas)) {
        setVisitadas(
          Array.from({ length: totalLaminas }, (_, i) =>
            Boolean(data.visitadas[i]),
          ),
        );
      }

      if (Array.isArray(data.slidesActivos)) {
        setSlidesActivos(
          Array.from({ length: totalLaminas }, (_, i) => {
            const valor = data.slidesActivos[i];

            return Number.isInteger(valor)
              ? Math.max(0, Math.min(3, valor))
              : 0;
          }),
        );
      }
    },

    onFinish: async (data) => {
      await onFinish(data);

      navigate("/app/tests", {
        replace: true,
      });
    },
  });

  /* CRONÓMETRO */

  const tiempoRestante = engine.minutes * 60 + engine.seconds;

  let timerClass = relojStyle.timer;

  if (tiempoRestante < 60) {
    timerClass += ` ${relojStyle.danger}`;
  } else if (tiempoRestante < 300) {
    timerClass += ` ${relojStyle.warning}`;
  }

  /* RESPUESTAS */

  const handleChange = (
    laminaIndex: number,
    orientacionIndex: number,
    texto: string,
  ) => {
    if (engine.inputLocked) return;

    const nuevasRespuestas = respuestas.map((lamina, index) => {
      if (index !== laminaIndex) {
        return lamina;
      }

      return {
        ...lamina,
        orientaciones: lamina.orientaciones.map(
          (orientacion, indexOrientacion) =>
            indexOrientacion === orientacionIndex
              ? {
                  ...orientacion,
                  respuesta: texto,
                }
              : orientacion,
        ),
      };
    });

    setRespuestas(nuevasRespuestas);

    engine.update({
      respuestas: nuevasRespuestas,
    });
  };

  /* NAVEGACIÓN */

  const irALamina = (index: number) => {
    if (engine.inputLocked || index < 0 || index >= totalLaminas) {
      return;
    }

    setLaminaActual(index);

    setVisitadas((anteriores) => {
      if (anteriores[index]) return anteriores;

      const nuevas = [...anteriores];
      nuevas[index] = true;
      return nuevas;
    });
  };

  const cambiarOrientacion = (index: number) => {
    if (engine.inputLocked || index < 0 || index >= ROTACIONES.length) {
      return;
    }

    setSlidesActivos((anteriores) => {
      const nuevas = [...anteriores];
      nuevas[laminaActual] = index;
      return nuevas;
    });
  };

  const moverOrientacion = (direccion: -1 | 1) => {
    const actual = slidesActivos[laminaActual];

    const siguiente =
      (actual + direccion + ROTACIONES.length) % ROTACIONES.length;

    cambiarOrientacion(siguiente);
  };

  /* PROGRESO */

  const cantidadOrientacionesRespondidas = (index: number) =>
    respuestas[index].orientaciones.filter(
      (orientacion) => orientacion.respuesta.trim().length > 0,
    ).length;

  const completadas = respuestas.map((lamina) =>
    lamina.orientaciones.every(
      (orientacion) => orientacion.respuesta.trim().length > 0,
    ),
  );

  const cantidadCompletadas = completadas.filter(Boolean).length;

  const orientacionesCompletadas = respuestas.reduce(
    (total, lamina) =>
      total +
      lamina.orientaciones.filter(
        (orientacion) => orientacion.respuesta.trim().length > 0,
      ).length,
    0,
  );

  const testCompleto = orientacionesCompletadas === totalOrientaciones;

  const porcentaje =
    totalOrientaciones > 0
      ? (orientacionesCompletadas / totalOrientaciones) * 100
      : 0;

  /* FINALIZACIÓN */

  const finalizar = async () => {
    if (!engine.started || enviando || engine.inputLocked || !testCompleto) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit({
        respuestas,
        nivel: "Interpretación Láminas",
        metodo: "Zulliger",
        totalLaminas,
        orientacionesPorLamina: ROTACIONES.length,
        totalRespuestas: orientacionesCompletadas,
      });
    } catch (error) {
      console.error("Error al finalizar Zulliger:", error);

      setEnviando(false);
    }
  };

  /* INTRODUCCIÓN */

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Test Zulliger"
        descripcion="Evaluación mediante interpretación de láminas"
        duracion="30 minutos"
        canStart={canStart}
        onConsentChange={setCanStart}
        onStart={engine.start}
        instrucciones={[
          {
            titulo: "Observe cada lámina",
            texto: (
              <p>
                Durante la evaluación se presentarán distintas láminas. Cada una
                podrá observarse en cuatro orientaciones.
              </p>
            ),
          },
          {
            titulo: "Explore las orientaciones",
            texto: (
              <p>
                Utilice las flechas para observar cada lámina en 0°, 90°, 180° y
                270°. Cada orientación tiene su propio campo de respuesta.
              </p>
            ),
          },
          {
            titulo: "Describa su percepción",
            texto: (
              <p>
                Para cada orientación, escriba qué ve, qué interpreta y qué
                siente o piensa al observarla.
              </p>
            ),
          },
          {
            titulo: "Responda con tranquilidad",
            texto: (
              <p>
                Utilice sus propias palabras. No es necesario buscar una
                respuesta específica.
              </p>
            ),
          },
        ]}
      />
    );
  }

  /* LÁMINA ACTIVA */

  const imagenActual = ZULLIGER_TEST.imagenes[laminaActual];

  const orientacionIndex = slidesActivos[laminaActual];

  const rotacion = ROTACIONES[orientacionIndex];

  const respuestaActual =
    respuestas[laminaActual].orientaciones[orientacionIndex].respuesta;

  const respondidasLamina = cantidadOrientacionesRespondidas(laminaActual);

  const laminaCompleta = completadas[laminaActual];

  const ultimaLamina = laminaActual === totalLaminas - 1;

  return (
    <main className={styles.page}>
      {engine.feedback}

      {engine.CameraComponent && <engine.CameraComponent />}

      {/* ENCABEZADO */}

      <header className={styles.testHeader}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>EVALUACIÓN PSICOLÓGICA</span>

          <h1>{ZULLIGER_TEST.nombre}</h1>

          <p>
            Observe cada lámina en sus cuatro orientaciones y describa qué
            percibe.
          </p>
        </div>

        <div className={styles.timeBlock}>
          <span>TIEMPO RESTANTE</span>

          <div className={timerClass}>
            {engine.minutes}:{String(engine.seconds).padStart(2, "0")}
          </div>
        </div>
      </header>

      {/* REGISTRO DE RESPUESTAS ARRIBA */}

      <TestNavigator
        total={totalLaminas}
        actual={laminaActual}
        respondidas={completadas}
        visitadas={visitadas}
        onSelect={irALamina}
        disabled={engine.inputLocked}
        itemLabel="Lámina"
        descripcion="Seleccioná una lámina para revisar o completar sus cuatro orientaciones."
      />

      {/* LÁMINA DEBAJO DEL REGISTRO */}

      <section className={styles.testContent}>
        <article
          className={styles.laminaCard}
          aria-labelledby="zulliger-lamina-title"
        >
          <div className={styles.laminaHeader}>
            <div>
              <span className={styles.laminaEyebrow}>
                LÁMINA {String(laminaActual + 1).padStart(2, "0")} DE{" "}
                {String(totalLaminas).padStart(2, "0")}
              </span>

              <h2 id="zulliger-lamina-title">
                Observe la imagen desde cada orientación
              </h2>

              <p>Utilice las flechas o seleccione directamente un ángulo.</p>
            </div>

            <span
              className={`${styles.status} ${
                laminaCompleta ? styles.statusCompleted : styles.statusPending
              }`}
            >
              {laminaCompleta
                ? "✓ Completa"
                : `${respondidasLamina}/4 respondidas`}
            </span>
          </div>

          {/* ORIENTACIÓN ACTUAL */}

          <div className={styles.orientationHeader}>
            <div>
              <span className={styles.orientationEyebrow}>
                ORIENTACIÓN ACTUAL
              </span>

              <strong>{rotacion}°</strong>
            </div>

            <span className={styles.slideCounter}>
              Vista {orientacionIndex + 1} de {ROTACIONES.length}
            </span>
          </div>

          {/* CARRUSEL */}

          <div className={styles.carousel}>
            <button
              type="button"
              className={styles.carouselArrow}
              disabled={engine.inputLocked}
              onClick={() => moverOrientacion(-1)}
              aria-label="Orientación anterior"
            >
              ‹
            </button>

            <div className={styles.imageArea}>
              <div className={styles.imageFrame}>
                <img
                  src={imagenActual}
                  alt={`Lámina ${
                    laminaActual + 1
                  }, orientación ${rotacion} grados`}
                  style={{
                    transform: `rotate(${rotacion}deg)`,
                  }}
                />
              </div>
            </div>

            <button
              type="button"
              className={styles.carouselArrow}
              disabled={engine.inputLocked}
              onClick={() => moverOrientacion(1)}
              aria-label="Orientación siguiente"
            >
              ›
            </button>
          </div>

          {/* NAVEGACIÓN POR ORIENTACIONES */}

          <div
            className={styles.orientationNav}
            aria-label="Orientaciones disponibles"
          >
            {ROTACIONES.map((angulo, index) => {
              const activa = index === orientacionIndex;

              const respondida =
                respuestas[laminaActual].orientaciones[index].respuesta.trim()
                  .length > 0;

              const estado = activa
                ? styles.orientationButtonActive
                : respondida
                  ? styles.orientationButtonAnswered
                  : styles.orientationButtonPending;

              return (
                <button
                  key={angulo}
                  type="button"
                  disabled={engine.inputLocked}
                  onClick={() => cambiarOrientacion(index)}
                  className={`${styles.orientationButton} ${estado}`}
                  aria-current={activa ? "true" : undefined}
                  aria-label={
                    `Orientación ${angulo} grados, ` +
                    (respondida ? "respondida" : "pendiente")
                  }
                >
                  <strong>{angulo}°</strong>

                  <small>{respondida ? "✓ Respondida" : "Pendiente"}</small>
                </button>
              );
            })}
          </div>

          {/* CAMPO DE RESPUESTA */}

          <div className={styles.answerArea}>
            <div className={styles.answerHeader}>
              <div>
                <span className={styles.answerEyebrow}>TU RESPUESTA</span>

                <label htmlFor={`respuesta-${laminaActual}-${rotacion}`}>
                  Lámina {laminaActual + 1} · Orientación {rotacion}°
                </label>

                <p>
                  Describa qué ve, siente o piensa al observar esta orientación.
                </p>
              </div>

              <span className={styles.characterCount}>
                {respuestaActual.length} caracteres
              </span>
            </div>

            <textarea
              id={`respuesta-${laminaActual}-${rotacion}`}
              className={styles.textarea}
              disabled={engine.inputLocked}
              placeholder="Escriba aquí lo que percibe al observar la imagen..."
              value={respuestaActual}
              onChange={(event) =>
                handleChange(laminaActual, orientacionIndex, event.target.value)
              }
            />

            <div className={styles.answerFooter}>
              <span>Lámina {laminaActual + 1}</span>

              <span aria-hidden="true">·</span>

              <span>Orientación {rotacion}°</span>

              {respuestaActual.trim() && (
                <span className={styles.savedIndicator}>✓ Respondida</span>
              )}
            </div>
          </div>
        </article>

        {/* NAVEGACIÓN INFERIOR */}

        <TestNavigationFooter
          actual={laminaActual}
          total={totalLaminas}
          respondidas={orientacionesCompletadas}
          totalRespuestas={totalOrientaciones}
          onPrevious={() => irALamina(laminaActual - 1)}
          onNext={() => irALamina(laminaActual + 1)}
          onFinish={finalizar}
          disabled={engine.inputLocked}
          enviando={enviando}
          itemLabel="Lámina"
          descripcion="Para finalizar, cada lámina debe tener respuesta en sus cuatro orientaciones."
          detalleProgreso={`${cantidadCompletadas} de ${totalLaminas} láminas completas`}
        />
      </section>
    </main>
  );
}
