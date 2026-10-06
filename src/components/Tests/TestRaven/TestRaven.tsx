import TestProgress from "../helpers/TestProgress";
import TestIntroModal from "../../Modal/TestIntro/TestIntroModal";
import { useState } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestRaven.module.css";
import { RAVEN_TEST } from "../../../data/tests/raven_test";
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
  const [matrizActual, setMatrizActual] = useState(0);
  const [visitadas, setVisitadas] = useState<boolean[]>(() => {
    const iniciales = Array(RAVEN_TEST.imagenes.length).fill(false);
    iniciales[0] = true;
    return iniciales;
  });

  const engine = useTestEngine({
    userId,
    testId: "raven",
    timeLimitMs: 30 * 60 * 1000,
    getResult: () => obtenerResultado(),
    onFinish,
  });

  const tiempoRestante = engine.minutes * 60 + engine.seconds;
  let timerClass = relojStyle.timer;
  if (tiempoRestante < 60) timerClass += ` ${relojStyle.danger}`;
  else if (tiempoRestante < 300) timerClass += ` ${relojStyle.warning}`;


  const handleChange = (index: number, value: string) => {
      const val = value.toString();
      if (val === "") {
        const nuevas = [...respuestas];
        nuevas[index] = "";
        setRespuestas(nuevas);
        return;
      }
      if (!/^\d+$/.test(val)) return; // solo dígitos
      let n = Number(val);
      if (n > 8) n = 8;
      if (n < 1) n = 1;
      const nuevas = [...respuestas];
      nuevas[index] = String(n);
      setRespuestas(nuevas);
    };

  const obtenerResultado = () => {
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

    return {
      score: 12 - errores,
      errores,
      nivel,
      respuestas: respuestas.map((r, i) => ({
        pregunta: `Matriz ${i + 1}`,
        respuesta: r || "Sin respuesta",
      })),
      metodo: "Test Raven",
    };
  };

  const finalizar = () => {
    void engine.submit(obtenerResultado()).catch(() => {});
  };

  const irAMatriz = (index: number) => {
    setMatrizActual(index);
    setVisitadas((prev) => {
      if (prev[index]) return prev;
      const copia = [...prev];
      copia[index] = true;
      return copia;
    });
  };

  if (!engine.started) {
    return <TestIntroModal nombre="Evaluación de Raven" descripcion="Observe cada matriz y complete el patrón"
      canStart={canStart} onConsentChange={setCanStart} onStart={engine.start}
      startDisabled={false} instrucciones={[{ titulo: "Observe la imagen", texto: <p>En cada matriz falta una pieza. Compare las opciones que aparecen debajo de la imagen.</p> },
{ titulo: "Escriba el número de su respuesta", texto: <p>Ingrese un número del 1 al 8 en el campo de cada matriz. Puede revisar sus respuestas antes de finalizar.</p> }]} />;
  }

  return (
    <div className={styles.page}>
      {engine.feedback}
      <header className={styles.header}><div><h1>Evaluación de Raven</h1><p>Observe cada matriz e ingrese el número de la pieza que completa el patrón, del 1 al 8.</p></div>
        <div><span>Tiempo restante</span><div className={timerClass}>{engine.minutes}:{String(engine.seconds).padStart(2, "0")}</div></div>
      </header>
      {engine.CameraComponent && <engine.CameraComponent />}
      <div className={styles.workspace}>
        <TestProgress
          total={totalPreguntas}
          completadas={respuestas.map(Boolean)}
          visitadas={visitadas}
          activa={matrizActual}
          onSelect={irAMatriz}
          itemLabel="Matriz"
        />
        <main className={styles.container}>
          <div className={styles.testCard} id={`test-item-${matrizActual}`}>
                <h2>Matriz {matrizActual + 1}</h2>
                <img
                  src={RAVEN_TEST.imagenes[matrizActual]}
                  alt={`Matriz ${matrizActual + 1}`}
                  className={styles.imagen}
                />

                <label htmlFor={`raven-${matrizActual}`}>Respuesta para la matriz {matrizActual + 1} (del 1 al 8)</label>
                <input
                  id={`raven-${matrizActual}`}
                  type="number"
                  disabled={engine.inputLocked}
                  min={1}
                  max={8}
                  value={respuestas[matrizActual]}
                  onChange={(e) => handleChange(matrizActual, e.target.value)}
                  placeholder="Respuesta"
                  className={styles.input}
                />
          </div>

          <div className={styles.navigation}>
            <BotonPersonalizado onClick={() => irAMatriz(matrizActual - 1)} disabled={matrizActual === 0 || engine.inputLocked} variant="secondary">
              Anterior
            </BotonPersonalizado>
            {matrizActual < totalPreguntas - 1 && (
              <BotonPersonalizado onClick={() => irAMatriz(matrizActual + 1)} disabled={engine.inputLocked} variant="primary">
                Siguiente
              </BotonPersonalizado>
            )}
          </div>

          <BotonPersonalizado
            className={styles.boton}
            onClick={finalizar}
            disabled={engine.inputLocked || respuestas.some((r) => r === "")}
            variant="primary"
          >
            Finalizar test
          </BotonPersonalizado>
        </main>
      </div>
    </div>
  );
}
