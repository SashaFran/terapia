import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TestK10 from "../../components/Tests/TestK10/TestK10";
import TestBFQ from "../../components/Tests/TestBFQ/TestBFQ";
import { guardarResultado } from "../../firebase/firestore";
import BotonPersonalizado from "../../components/Boton/Boton";
import TestZulliger from "../../components/Tests/TestZulliger/TestZulliger";
import TestBender from "../../components/Tests/TestBender/TestBender";
import { generarResumenLaminas } from "../../utils/generarResumenLaminas";
import TestLaminas from "../../components/Tests/TestLaminas/TestLaminas";

export default function TestPage() {
  const { testId } = useParams();
  const [searchParams] = useSearchParams();

  const sesionId = searchParams.get("sesion");
  const pacienteId = searchParams.get("paciente");

  const [etapa, setEtapa] = useState<"intro" | "test">("intro");

  if (!sesionId || !pacienteId || !testId) {
    return <p>Error: datos de sesión incompletos</p>;
  }

  return (
    <div>
      {etapa === "intro" && (
        <>
          <h2>Test en ejecución</h2>

          <p><strong>Test:</strong> {testId.toUpperCase()}</p>
          <p><strong>Duración estimada:</strong> 3 a 5 minutos</p>
          <p>
            A continuación se presentarán una serie de preguntas.
            Respondé con sinceridad según cómo te sentiste en el último mes.
          </p>

          <BotonPersonalizado
            variant="primary"
            onClick={() => setEtapa("test")} disabled={false}
          >
            Iniciar evaluación
          </BotonPersonalizado>
        </>
      )}

      {etapa === "test" && (
  <>
    {/* Test Kessler K10 */}
    {testId === "k10" && (
      <TestK10
        onFinish={(resultado) => {
          console.log("Resultado K10:", resultado);
          // Lógica para guardar
        }}
      />
    )}

    {/* Test Big Five (BFQ) */}
    {testId === "bfq" && (
      <TestBFQ
        onFinish={(resultado) => {
          console.log("Resultado BFQ:", resultado);

          const scoreTotal = Object.values(resultado.dimensiones)
            .reduce((acc, val) => acc + val, 0);
          guardarResultado({
            testId: "bfq",
            score: scoreTotal, // ✅ ahora existe
            nivel: "Perfil Big Five", // ✅ string fijo
            respuestas: resultado.respuestas,
            metodo: resultado.metodo,
            fecha: new Date(),
            pacienteId,
            sesionId,
            dimensiones: resultado.dimensiones
          });
        }}
        
        />
    )}

    {testId === "bender" && (
      <TestBender onFinish={(resultado) => {
        console.log("Resultado Bender:", resultado);
        guardarResultado({
          testId: "bender",
          score: resultado.score,
          nivel: resultado.nivel,
          respuestas: resultado.respuestas,
          metodo: resultado.metodo,
          fecha: new Date(),
          pacienteId,
          sesionId,
        });
      }} />
    )}

    {testId === "zulliger" && (
      <TestZulliger onFinish={(resultado) => {
        console.log("Resultado Zulliger:", resultado);
        guardarResultado({
          testId: "zulliger",
          score: resultado.score,
          nivel: resultado.nivel,
          respuestas: resultado.respuestas,
          metodo: resultado.metodo,
          fecha: new Date(),
          pacienteId,
          sesionId,
        });
      }} />
    )}

    {testId === "laminas" && (
  <TestLaminas
    onFinish={(resultado) => {
      console.log("Resultado Láminas:", resultado);

      const resumenClinico = generarResumenLaminas({
        pacienteNombre: "Paciente",
        fecha: new Date(),
        respuestas: resultado.respuestas,
      });

      guardarResultado({
        testId: "laminas",
        score: null, // 👈 importante
        nivel: "Interpretación Láminas",
        respuestas: resultado.respuestas,
        metodo: resultado.metodo,
        fecha: new Date(),
        pacienteId,
        sesionId,
        resumenClinico, // 👈 ESTO ES LA CLAVE
      });
    }}
  />
)}
  </>
  
)}
    </div>
  );
}
