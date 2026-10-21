
import { useState } from "react";

import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestNavigator from "../helpers/TestNavigator/TestNavigator";
import TestNavigationFooter from "../helpers/TestNavigationFooter/TestNavigationFooter";
import TestTimer from "../helpers/TestTimer/TestTimer";

import { RAVEN_TEST } from "../../../data/tests/raven_test";
import { useTestEngine } from "../helpers/useTestEngine";

import styles from "./TestRaven.module.css";

type Props = {
  onFinish: (resultado: any) => void | Promise<void>;
  userId: string | number;
};

const RESPUESTAS_CORRECTAS = [
  1, 7, 8, 5, 5, 7, 6, 8, 1, 1, 6, 3,
];

const OPCIONES = Array.from(
  { length: 8 },
  (_, index) => String(index + 1)
);

export default function TestRaven({
  onFinish,
  userId,
}: Props) {
  const totalPreguntas = RAVEN_TEST.imagenes.length;

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [respuestas, setRespuestas] = useState<string[]>(
    () => Array(totalPreguntas).fill("")
  );

  const [matrizActual, setMatrizActual] = useState(0);

  const [visitadas, setVisitadas] = useState<boolean[]>(
    () => {
      const iniciales = Array(totalPreguntas).fill(false);

      if (totalPreguntas > 0) {
        iniciales[0] = true;
      }

      return iniciales;
    }
  );

  /* ==========================================
     RESULTADO
     ========================================== */

  const obtenerResultado = () => {
    let errores = 0;

    respuestas.forEach((respuesta, index) => {
      if (
        Number(respuesta) !==
        RESPUESTAS_CORRECTAS[index]
      ) {
        errores++;
      }
    });

    let nivel = "Inferior";

    if (errores === 0) {
      nivel = "Superior";
    } else if (errores <= 2) {
      nivel = "Normal Superior";
    } else if (errores <= 4) {
      nivel = "Normal Promedio";
    }

    return {
      score: totalPreguntas - errores,
      errores,
      nivel,
      respuestas: respuestas.map((respuesta, index) => ({
        pregunta: `Matriz ${index + 1}`,
        respuesta: respuesta || "Sin respuesta",
      })),
      metodo: "Test Raven",
    };
  };

  /* ==========================================
     MOTOR DE EVALUACIÓN
     ========================================== */

  const engine = useTestEngine({
    userId,
    testId: "raven",
    timeLimitMs: 30 * 60 * 1000,

    getResult: () => ({
      ...obtenerResultado(),
      matrizActual,
      visitadas,
    }),

    onRestore: (data: any) => {
      if (Array.isArray(data.respuestas)) {
        setRespuestas(
          Array.from(
            { length: totalPreguntas },
            (_, index) => {
              const item = data.respuestas[index];

              const valor =
                typeof item === "object" &&
                item !== null
                  ? item.respuesta
                  : item;

              if (
                valor == null ||
                valor === "Sin respuesta"
              ) {
                return "";
              }

              const texto = String(valor);

              return /^[1-8]$/.test(texto)
                ? texto
                : "";
            }
          )
        );
      }

      if (Number.isInteger(data.matrizActual)) {
        setMatrizActual(
          Math.max(
            0,
            Math.min(
              totalPreguntas - 1,
              data.matrizActual
            )
          )
        );
      }

      if (Array.isArray(data.visitadas)) {
        setVisitadas(
          Array.from(
            { length: totalPreguntas },
            (_, index) =>
              Boolean(data.visitadas[index])
          )
        );
      }
    },

    onFinish,
  });

  /* ==========================================
     PROGRESO
     ========================================== */

  const respondidas = respuestas.map(
    (respuesta) => /^[1-8]$/.test(respuesta)
  );

  const cantidadRespondidas =
    respondidas.filter(Boolean).length;

  const testCompleto =
    totalPreguntas > 0 &&
    cantidadRespondidas === totalPreguntas;

  const ultimaMatriz =
    matrizActual === totalPreguntas - 1;

  const respuestaActual =
    respuestas[matrizActual] ?? "";

  /* ==========================================
     SELECCIÓN DE RESPUESTA
     ========================================== */

  const handleChange = (
    index: number,
    valor: string
  ) => {
    if (
      engine.inputLocked ||
      enviando ||
      !/^[1-8]$/.test(valor)
    ) {
      return;
    }

    const nuevasRespuestas = [...respuestas];
    nuevasRespuestas[index] = valor;

    setRespuestas(nuevasRespuestas);

    engine.update({
      respuestas: nuevasRespuestas.map(
        (respuesta, posicion) => ({
          pregunta: `Matriz ${posicion + 1}`,
          respuesta:
            respuesta || "Sin respuesta",
        })
      ),
    });
  };

  /* ==========================================
     NAVEGACIÓN
     ========================================== */

  const irAMatriz = (index: number) => {
    if (
      engine.inputLocked ||
      enviando ||
      index < 0 ||
      index >= totalPreguntas
    ) {
      return;
    }

    setMatrizActual(index);

    setVisitadas((anteriores) => {
      if (anteriores[index]) {
        return anteriores;
      }

      const nuevas = [...anteriores];
      nuevas[index] = true;

      return nuevas;
    });
  };

  const irAnterior = () => {
    irAMatriz(matrizActual - 1);
  };

  const irSiguiente = () => {
    irAMatriz(matrizActual + 1);
  };

  /* ==========================================
     FINALIZACIÓN
     ========================================== */

  const finalizar = async () => {
    if (
      !engine.started ||
      engine.inputLocked ||
      enviando ||
      !testCompleto
    ) {
      return;
    }

    setEnviando(true);

    try {
      await engine.submit(obtenerResultado());
    } catch (error) {
      console.error(
        "Error al finalizar Raven:",
        error
      );

      setEnviando(false);
    }
  };

  /* ==========================================
     INTRODUCCIÓN
     ========================================== */

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Evaluación de Raven"
        descripcion="Observe cada matriz y complete el patrón"
        canStart={canStart}
        onConsentChange={setCanStart}
        onStart={engine.start}
        startDisabled={!userId}
        instrucciones={[
          {
            titulo: "Observe la imagen",
            texto: (
              <p>
                En cada matriz falta una pieza.
                Compare las opciones que aparecen
                en la imagen.
              </p>
            ),
          },
          {
            titulo: "Seleccione una respuesta",
            texto: (
              <p>
                Elija el número del 1 al 8 que
                corresponda a la pieza correcta.
                Puede revisar sus respuestas antes
                de finalizar.
              </p>
            ),
          },
        ]}
      />
    );
  }

  /* ==========================================
     EVALUACIÓN
     ========================================== */

  return (
    <main className={styles.page}>
      {engine.feedback}

      {engine.CameraComponent && (
        <engine.CameraComponent />
      )}

      {/* ENCABEZADO */}

      <header className={styles.header}>
        <div className={styles.headerText}>
          <span className={styles.eyebrow}>
            EVALUACIÓN PSICOLÓGICA
          </span>

          <h1>Evaluación de Raven</h1>

          <p>
            Observe cada matriz y seleccione el
            número de la pieza que completa el
            patrón.
          </p>
        </div>

        <TestTimer
          minutes={engine.minutes}
          seconds={engine.seconds}
        />
      </header>

      {/* REGISTRO SUPERIOR */}

      <TestNavigator
        total={totalPreguntas}
        actual={matrizActual}
        respondidas={respondidas}
        visitadas={visitadas}
        onSelect={irAMatriz}
        disabled={engine.inputLocked || enviando}
        itemLabel="Matriz"
        descripcion="Seleccioná una matriz para revisar o modificar su respuesta."
      />

      {/* CONTENIDO INFERIOR */}

      <section className={styles.content}>
        <article className={styles.matrixCard}>
          <div className={styles.matrixHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                MATRIZ{" "}
                {String(matrizActual + 1).padStart(
                  2,
                  "0"
                )}
                {" "}DE{" "}
                {String(totalPreguntas).padStart(
                  2,
                  "0"
                )}
              </span>

              <h2>
                Complete el patrón
              </h2>

              <p>
                Observe la imagen y determine
                cuál de las opciones completa
                correctamente la matriz.
              </p>
            </div>

            <span
              className={`${styles.status} ${
                respondidas[matrizActual]
                  ? styles.statusCompleted
                  : styles.statusPending
              }`}
            >
              {respondidas[matrizActual]
                ? "✓ Respondida"
                : "Pendiente"}
            </span>
          </div>

          {/* IMAGEN */}

          <div className={styles.imageSection}>
            <div className={styles.imageHeader}>
              <div>
                <span className={styles.sectionEyebrow}>
                  MATERIAL DE EVALUACIÓN
                </span>

                <strong>
                  Matriz {matrizActual + 1}
                </strong>
              </div>

              <span className={styles.imageHint}>
                Seleccione la pieza correcta
              </span>
            </div>

            <div className={styles.imageFrame}>
              <img
                key={matrizActual}
                src={
                  RAVEN_TEST.imagenes[matrizActual]
                }
                alt={`Matriz ${matrizActual + 1} del test de Raven con sus alternativas de respuesta`}
                className={styles.imagen}
              />
            </div>
          </div>

          {/* OPCIONES DE RESPUESTA */}

          <fieldset
            className={styles.answerArea}
            disabled={engine.inputLocked || enviando}
          >
            <legend className={styles.visuallyHidden}>
              Respuesta de la matriz{" "}
              {matrizActual + 1}
            </legend>

            <div className={styles.answerHeader}>
              <div>
                <span className={styles.sectionEyebrow}>
                  TU RESPUESTA
                </span>

                <h3>
                  ¿Qué pieza completa el patrón?
                </h3>

                <p>
                  Seleccioná una opción del 1 al 8,
                  según la numeración de la imagen.
                </p>
              </div>

              {respuestaActual && (
                <span className={styles.selectedBadge}>
                  Opción {respuestaActual}
                </span>
              )}
            </div>

            <div
              className={styles.optionsGrid}
            >
              {OPCIONES.map((opcion) => {
                const seleccionada =
                  respuestaActual === opcion;

                return (
                  <label
                    key={opcion}
                    className={`${styles.option} ${
                      seleccionada
                        ? styles.optionSelected
                        : ""
                    }`}
                  >
                    <input
                      type="radio"
                      name={`raven-${matrizActual}`}
                      value={opcion}
                      checked={seleccionada}
                      onChange={() =>
                        handleChange(
                          matrizActual,
                          opcion
                        )
                      }
                    />

                    <span className={styles.optionNumber}>
                      {opcion}
                    </span>

                    <span className={styles.optionIndicator}>
                      {seleccionada ? "✓" : ""}
                    </span>
                  </label>
                );
              })}
            </div>

            <div className={styles.answerFooter}>
              <span>
                Matriz {matrizActual + 1} de{" "}
                {totalPreguntas}
              </span>

              <span
                className={
                  respuestaActual
                    ? styles.answeredText
                    : styles.pendingText
                }
              >
                {respuestaActual
                  ? `✓ Opción ${respuestaActual} seleccionada`
                  : "Seleccioná una respuesta"}
              </span>
            </div>
          </fieldset>
        </article>

        {/* FOOTER COMPARTIDO */}

        <TestNavigationFooter
          actual={matrizActual}
          total={totalPreguntas}
          respondidas={cantidadRespondidas}
          totalRespuestas={totalPreguntas}
          onPrevious={irAnterior}
          onNext={irSiguiente}
          onFinish={finalizar}
          disabled={engine.inputLocked}
          enviando={enviando}
          itemLabel="Matriz"
          descripcion="Respondé las matrices pendientes antes de finalizar la evaluación."
          detalleProgreso={`${cantidadRespondidas} de ${totalPreguntas} matrices respondidas`}
        />

        {ultimaMatriz && !testCompleto && (
          <p
            className={styles.pendingNotice}
            role="status"
          >
            Todavía quedan{" "}
            {totalPreguntas - cantidadRespondidas}{" "}
            matrices sin responder. Podés
            seleccionarlas desde el registro superior.
          </p>
        )}
      </section>
    </main>
  );
}
