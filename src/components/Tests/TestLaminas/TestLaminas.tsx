import { useState } from "react";
import TestBender from "../TestBender/TestBender";
import TestZulliger from "../TestZulliger/TestZulliger";
import BotonPersonalizado from "../../Boton/Boton";
import { generarResumenLaminas } from "../../../utils/generarResumenLaminas";


type Props = {
  onFinish: (resultado: any) => void;
};

export default function TestLaminas({ onFinish }: Props) {
  const [zulliger, setZulliger] = useState<any>(null);
  const [bender, setBender] = useState<any>(null);

  const finalizar = () => {
    onFinish({
  metodo: "LAMINAS",

  // 👇 esto lo va a usar el PDF para la tabla
  respuestas: [
    ...zulliger.map((r: any, i: number) => ({
      pregunta: `Zulliger ${i + 1}`,
      respuesta:
        typeof r === "string"
          ? r
          : r?.texto || r?.respuesta || "Sin respuesta",
    })),
    ...bender.map((r: any, i: number) => ({
      pregunta: `Bender ${i + 1}`,
      respuesta:
        typeof r === "string"
          ? r
          : r?.texto || r?.respuesta || "Sin respuesta",
    })),
  ],

  // 👇 esto evita undefined
  score: null,

  // 👇 esto se muestra en el PDF
  nivel: "Interpretación Láminas",

  // 👇 esto es CLAVE para que no diga "no disponible"
  resumenClinico: generarResumenLaminas({
    pacienteNombre: "Paciente",
    fecha: new Date(),
    respuestas: { zulliger, bender },
  }),
});
  };

  return (
    <div>
      <h2>Evaluación con Láminas</h2>

      <TestZulliger onFinish={(res) => setZulliger(res.respuestas)} />
<TestBender onFinish={(res) => setBender(res.respuestas)} />

      <BotonPersonalizado onClick={finalizar} disabled={!zulliger || !bender} variant="primary">
        Finalizar evaluación completa
      </BotonPersonalizado>
    </div>
  );
}