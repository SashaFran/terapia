
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import TestNavigator from "../helpers/TestNavigator/TestNavigator";
import TestNavigationFooter from "../helpers/TestNavigationFooter/TestNavigationFooter";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import TestTimer from "../helpers/TestTimer/TestTimer";

import { BENDER_TEST } from "../../../data/tests/bender_test";
import RotatableImage from "./RotatableImage";

import styles from "./TestBender.module.css";

import { useTestEngine } from "../helpers/useTestEngine";

type Props = {
  onFinish: (resultado: any) => void | Promise<void>;
  userId: string | number;
};

export default function TestBender({
  onFinish,
  userId,
}: Props) {
  const navigate = useNavigate();

  const totalLaminas = BENDER_TEST.imagenes.length;

  const [canStart, setCanStart] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const [respuestas, setRespuestas] = useState<string[]>(
    () => Array(totalLaminas).fill("")
  );

  const [laminaActual, setLaminaActual] = useState(0);

  const [visitadas, setVisitadas] = useState<boolean[]>(
    () => {
      const iniciales = Array(totalLaminas).fill(false);

      if (totalLaminas > 0) {
        iniciales[0] = true;
      }

      return iniciales;
    }
  );

  const engine = useTestEngine({
    userId,
    testId: "bender",
    timeLimitMs: 30 * 60 * 1000,

    getResult: () => ({
      respuestas,
      laminaActual,
      visitadas,
    }),

    onRestore: (data: any) => {
      if (Array.isArray(data.respuestas)) {
        setRespuestas(
          Array.from(
            { length: totalLaminas },
            (_, index) =>
              typeof data.respuestas[index] === "string"
                ? data.respuestas[index]
                : ""
          )
        );
      }

      if (Number.isInteger(data.laminaActual)) {
        setLaminaActual(
          Math.max(
            0,
            Math.min(
              totalLaminas - 1,
              data.laminaActual
            )
          )
        );
      }

      if (Array.isArray(data.visitadas)) {
        setVisitadas(
          Array.from(
            { length: totalLaminas },
            (_, index) => Boolean(data.visitadas[index])
          )
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


  /* RESPUESTAS */

  const respondidas = respuestas.map(
    (respuesta) => respuesta.trim().length > 0
  );

  const cantidadRespondidas =
    respondidas.filter(Boolean).length;

  const testCompleto =
    totalLaminas > 0 &&
    cantidadRespondidas === totalLaminas;

  const respuestaActual =
    respuestas[laminaActual] ?? "";

  const handleChange = (
    index: number,
    texto: string
  ) => {
    if (engine.inputLocked || enviando) return;

    const nuevasRespuestas = [...respuestas];
    nuevasRespuestas[index] = texto;

    setRespuestas(nuevasRespuestas);

    engine.update({
      respuestas: nuevasRespuestas,
    });
  };

  /* NAVEGACIÓN */

  const irALamina = (index: number) => {
    if (
      engine.inputLocked ||
      enviando ||
      index < 0 ||
      index >= totalLaminas
    ) {
      return;
    }

    setLaminaActual(index);

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
    irALamina(laminaActual - 1);
  };

  const irSiguiente = () => {
    irALamina(laminaActual + 1);
  };

  /* FINALIZACIÓN */

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
      await engine.submit({
        respuestas,
        nivel: "Interpretación Láminas",
        metodo: "Bender",
      });
    } catch (error) {
      console.error(
        "Error al finalizar Bender:",
        error
      );

      setEnviando(false);
    }
  };

  /* INTRODUCCIÓN */

  if (!engine.started) {
    return (
      <TestIntroModal
        nombre="Test Bender"
        descripcion="Observe las láminas y escriba su respuesta"
        canStart={canStart}
        onConsentChange={setCanStart}
        onStart={engine.start}
        startDisabled={!userId}
        instrucciones={[
          {
            titulo: "Observe cada lámina",
            texto: (
              <p>
                Mire cada imagen con atención.
              </p>
            ),
          },
          {
            titulo: "Escriba su respuesta",
            texto: (
              <p>
                Describa qué ve y qué siente o piensa
                al observarla. Puede revisar lo
                escrito antes de finalizar.
              </p>
            ),
          },
        ]}
      />
    );
  }

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

          <h1>{BENDER_TEST.nombre}</h1>

          <p>
            Observe cada lámina y escriba qué ve,
            siente o piensa al verla.
          </p>
        </div>

<TestTimer
  minutes={engine.minutes}
  seconds={engine.seconds}
/>
      </header>

      {/* REGISTRO DE RESPUESTAS ARRIBA */}

      <TestNavigator
        total={totalLaminas}
        actual={laminaActual}
        respondidas={respondidas}
        visitadas={visitadas}
        onSelect={irALamina}
        disabled={engine.inputLocked || enviando}
        itemLabel="Lámina"
        descripcion="Seleccioná una lámina para revisar o completar su respuesta."
      />

      {/* LÁMINA Y RESPUESTA ABAJO */}

      <section className={styles.content}>
        <article className={styles.laminaCard}>
          <div className={styles.laminaHeader}>
            <div>
              <span className={styles.sectionEyebrow}>
                LÁMINA{" "}
                {String(laminaActual + 1).padStart(2, "0")}
                {" "}DE{" "}
                {String(totalLaminas).padStart(2, "0")}
              </span>

              <h2>
                Observe la imagen
              </h2>

              <p>
                Mire la lámina con atención antes
                de escribir su respuesta.
              </p>
            </div>

            <span
              className={`${styles.status} ${
                respondidas[laminaActual]
                  ? styles.statusCompleted
                  : styles.statusPending
              }`}
            >
              {respondidas[laminaActual]
                ? "✓ Respondida"
                : "Pendiente"}
            </span>
          </div>

          {/* IMAGEN INTERACTIVA */}

          <div className={styles.imageSection}>
            <div className={styles.imageHeader}>
              <span className={styles.sectionEyebrow}>
                MATERIAL DE EVALUACIÓN
              </span>

              <strong>
                Lámina {laminaActual + 1}
              </strong>
            </div>

            <div className={styles.imageFrame}>
              <RotatableImage
                key={laminaActual}
                src={BENDER_TEST.imagenes[laminaActual]}
              />
            </div>
          </div>

          {/* CAMPO DE RESPUESTA */}

          <div className={styles.answerArea}>
            <div className={styles.answerHeader}>
              <div>
                <span className={styles.sectionEyebrow}>
                  TU RESPUESTA
                </span>

                <label
                  htmlFor={`bender-${laminaActual}`}
                >
                  Respuesta de la lámina{" "}
                  {laminaActual + 1}
                </label>

                <p>
                  Describa qué ve, siente o piensa
                  al observar esta imagen.
                </p>
              </div>

              <span className={styles.characterCount}>
                {respuestaActual.length} caracteres
              </span>
            </div>

            <textarea
              id={`bender-${laminaActual}`}
              className={styles.textarea}
              disabled={engine.inputLocked || enviando}
              placeholder="Escriba aquí su respuesta..."
              value={respuestaActual}
              onChange={(event) =>
                handleChange(
                  laminaActual,
                  event.target.value
                )
              }
            />

            <div className={styles.answerFooter}>
              <span>
                Lámina {laminaActual + 1} de{" "}
                {totalLaminas}
              </span>

              {respondidas[laminaActual] && (
                <span className={styles.answeredIndicator}>
                  ✓ Respondida
                </span>
              )}
            </div>
          </div>
        </article>

        {/* NAVEGACIÓN Y FINALIZACIÓN COMPARTIDAS */}

        <TestNavigationFooter
          actual={laminaActual}
          total={totalLaminas}
          respondidas={cantidadRespondidas}
          totalRespuestas={totalLaminas}
          onPrevious={irAnterior}
          onNext={irSiguiente}
          onFinish={finalizar}
          disabled={engine.inputLocked}
          enviando={enviando}
          itemLabel="Lámina"
          descripcion="Completá la respuesta de cada lámina antes de finalizar la evaluación."
          detalleProgreso={`${cantidadRespondidas} de ${totalLaminas} láminas respondidas`}
        />
      </section>
      
    </main>
  );
}
