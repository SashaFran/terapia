/* import { useParams } from "react-router-dom";*/
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";


export default function TestRunner() {
    const navigate = useNavigate();
    const { testId } = useParams();
    const [searchParams] = useSearchParams();

    const pacienteId = searchParams.get("paciente");
    const sesionId = searchParams.get("sesion");

  //const { testId } = useParams();

    const handleFinish = async (resultado: any) => {
        const data = {
            testId,
            score: resultado.score,
            nivel: resultado.nivel,
            respuestas: resultado.respuestas,
            metodo: resultado.metodo,
            fecha: new Date(),
            pacienteId,
            sesionId,
        };

        console.log("Guardando en Firestore:", data);

        await addDoc(collection(db, "resultados"), data);
        navigate(`/pacientes/${pacienteId}`);
    };


  if (testId === "k10") {
    return <TestK10 onFinish={handleFinish} />;
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