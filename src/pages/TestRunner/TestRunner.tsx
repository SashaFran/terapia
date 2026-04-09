/* import { useParams } from "react-router-dom";*/
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import TestLaminas from "../../components/Tests/TestLaminas/TestLaminas";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import TestRaven from "../../components/Tests/TestRaven/TestRaven";


export default function TestRunner() {
    const navigate = useNavigate();
    const { testId } = useParams();
    const [searchParams] = useSearchParams();

    const pacienteId = searchParams.get("paciente");
    const sesionId = searchParams.get("sesion");

  //const { testId } = useParams();

 const handleFinish = async (resultado: any) => {
  let data: any = {
    testId,
    respuestas: resultado.respuestas,
    metodo: resultado.metodo,
    fecha: new Date(),
    pacienteId,
    sesionId,
  };

  if (testId === "k10") {
    data.score = resultado.score;
    data.nivel = resultado.nivel;
  }

  if (testId === "bfq") {
    const scoreTotal = Object.values(resultado.dimensiones || {})
      .reduce((acc: number, val: any) => acc + (val || 0), 0);

    data.score = scoreTotal;
    data.nivel = "Perfil Big Five";
    data.dimensiones = resultado.dimensiones;
  }
    if (testId === "raven") {
    data.nivel = resultado.nivel;
    data.errores = resultado.errores;
    data.respuestas = resultado.respuestas;
  }

 if (testId === "laminas") {
  data.nivel = "Interpretación Láminas";

  data.resumenClinico = generarResumenLaminas({
    pacienteNombre: "Paciente",
    fecha: new Date(),
    respuestas: resultado.respuestas,
  });
}
console.log("DATA FINAL:", data);
  await addDoc(collection(db, "resultados"), data);
  navigate(`/pacientes/${pacienteId}`);
};

if (testId === "k10") {
  return <TestK10 onFinish={handleFinish} />;
}

if (testId === "bfq") {
  return <TestBFQ onFinish={handleFinish} />;
}

if (testId === "laminas") {
  return <TestLaminas onFinish={handleFinish} />;
}
if (testId === "raven") {
  return <TestRaven onFinish={handleFinish} />;
}

return <p>Test no encontrado</p>;


  
}
/* import { useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase";
import { addDoc, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import BotonPersonalizado from "../../components/Boton/Boton";

export default function TestRunner() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const sesionId = searchParams.get("sesion");
  const pacienteId = searchParams.get("paciente");

  const [started, setStarted] = useState(false);

  if (!testId || !sesionId || !pacienteId) {
    return <p>Error: datos incompletos</p>;
  }

  const handleFinish = async (resultado: any) => {
    await addDoc(db, "resultados", {
      ...resultado,
      pacienteId,
      sesionId,
      testId,
      fecha: serverTimestamp(),
    });

    await updateDoc(doc(db, "sesiones", sesionId), {
      estado: "finalizada",
    });

    navigate(`/perfil/${pacienteId}`);
  };

  if (!started) {
    return (
      <div>
        <h2>Test en ejecución</h2>
        <p>Test: {testId.toUpperCase()}</p>
        <p>Duración estimada: 3 a 5 minutos</p>

        <BotonPersonalizado
          variant="primary"
          onClick={() => setStarted(true)}
        >
          Iniciar evaluación
        </BotonPersonalizado>
      </div>
    );
  }

  if (testId === "k10") {
    return <TestK10 onFinish={handleFinish} />;
  }

  return <p>Test no encontrado</p>;
}
 */