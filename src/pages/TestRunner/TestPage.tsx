import { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import TestK10 from "./k10/TestK10";
import BotonPersonalizado from "../../components/Boton/Boton";

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
            onClick={() => setEtapa("test")}
          >
            Iniciar evaluación
          </BotonPersonalizado>
        </>
      )}

      {etapa === "test" && testId === "k10" && (
        <TestK10
          onFinish={(resultado) => {
            console.log("Resultado:", resultado);
            // acá después guardamos en Firestore
          }}
        />
      )}
    </div>
  );
}
