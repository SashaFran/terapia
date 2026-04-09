import { useRef, useState } from "react";
import TestBender from "../TestBender/TestBender";
import TestZulliger from "../TestZulliger/TestZulliger";
import BotonPersonalizado from "../../Boton/Boton";
import { generarResumenLaminas } from "../../../utils/generarResumenLaminas";
import styles from "./TestLaminas.module.css";
import Modal from "../../Modal/Modal";

type Props = {
  onFinish: (resultado: any) => void;
};

export default function TestLaminas({ onFinish }: Props) {
  const [zulliger, setZulliger] = useState<any>(null);
  const [bender, setBender] = useState<any>(null);

  resumenClinico: generarResumenLaminas({
    pacienteNombre: "Paciente",
    fecha: new Date(),
    respuestas: { zulliger, bender },
  })

  // Estados para controlar el inicio del test y el tiempo
  const [testIniciado, setTestIniciado] = useState(false);
  const startTimeRef = useRef<number>(0); // Usamos useRef para almacenar el timestamp de inicio

  // ----------------------
  // Lógica del test y tiempo
  // ----------------------
  const iniciarTest = () => {
    setTestIniciado(true);
    startTimeRef.current = Date.now(); // Registramos el momento exacto en que se hace clic en Iniciar
  };

const calcularResultado = () => {
  if (!testIniciado) return;

  const endTime = Date.now();
  const tiempoTotalMs = endTime - startTimeRef.current;

  const normalizar = (arr: any[], tipo: string) =>
    arr.map((r: any, i: number) => ({
      pregunta: `${tipo} ${i + 1}`,
      respuesta:
        typeof r === "string"
          ? r
          : r?.texto || r?.respuesta || "Sin respuesta",
    }));

  const respuestasFinales = [
    ...normalizar(zulliger || [], "Zulliger"),
    ...normalizar(bender || [], "Bender"),
  ];

  onFinish({
    score: null,
    nivel: "Interpretación de Láminas",
    respuestas: respuestasFinales, // 👈 ACA ESTÁ LA CLAVE
    metodo: "Test Laminas",
    tiempoTotalMs,
  });
};

  // ----------------------
  // Renderizado Condicional
  // ----------------------

  // Si el test no ha iniciado, mostramos el modal de bienvenida
  if (!testIniciado) {
    return (
      <Modal
        abierto={true} // Siempre abierto hasta que se inicia el test
        onCerrar={() => {}} // No permitimos cerrar sin iniciar
        titulo="Instrucciones para la Evaluación con Láminas"
      >
        <li>
          Esta evaluación <strong>monitoriza el tiempo</strong> que se tarda en
          completarse, con fines exclusivamente estadísticos y de investigación
          interna.
        </li>

        <li>
          <strong>Importante:</strong> El tiempo empleado{" "}
          <strong>no afectará</strong> a la puntuación final de su evaluación ni
          a los resultados clínicos.
        </li>
        <li style={{marginTop: "1rem"}}>
          Por favor, <strong>relájese</strong>, mire atentamente cada imagen (manipule libremente cada una) y
          responda con total <strong>sinceridad</strong>. Este test se compone de dos partes. Al finalizar cada una de manera <strong>individual</strong>, deberá hacer clic en <strong>«Finalizar test»</strong> y continuar. Al finalizar ambas, deberá hacer clic en el botón <strong>«Finalizar evaluación completa»</strong> para enviar sus respuestas.
        </li>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: "20px",
          }}
        >
          <BotonPersonalizado variant="primary" onClick={iniciarTest} disabled={false}>
            Comenzar Evaluación
          </BotonPersonalizado>
        </div>
      </Modal>
    );
  }

  return (
    <div className={styles.container}>
      <h2>Evaluación con Láminas</h2>
      <TestZulliger onFinish={(res) => setZulliger(res.respuestas)} />
        <TestBender onFinish={(res) => setBender(res.respuestas)} />

      <BotonPersonalizado className={styles.boton} onClick={calcularResultado} disabled={!zulliger || !bender} variant="primary">
        Finalizar evaluación completa
      </BotonPersonalizado>
    </div>
  );
}