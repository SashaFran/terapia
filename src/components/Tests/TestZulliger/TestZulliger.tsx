import { useState, useRef } from "react";
import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";
import RotatableImage from "./RotatableImage";
import BotonPersonalizado from "../../Boton/Boton";

type Props = {
  onFinish: (resultado: any) => void;
};

export default function TestZulliger({ onFinish }: Props) {
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(ZULLIGER_TEST.imagenes.length).fill("")
  );

  const startTimeRef = useRef<number>(Date.now());

  const handleChange = (index: number, texto: string) => {
    const copy = [...respuestas];
    copy[index] = texto;
    setRespuestas(copy);
  };

  const finalizar = () => {
    const tiempoTotalMs = Date.now() - startTimeRef.current;

    onFinish({
      respuestas,
      metodo: "ZULLIGER",
      tiempoTotalMs,
    });
  };

  return (
    <div className="global-container">
      <h2>{ZULLIGER_TEST.nombre}</h2>

      {ZULLIGER_TEST.imagenes.map((img, i) => (
        <div key={i} style={{ marginBottom: 40 }}>
          <RotatableImage src={img} />

          <textarea
            placeholder="¿Qué ves en esta lámina?"
            value={respuestas[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            style={{
              width: "100%",
              marginTop: 10,
              minHeight: 80,
            }}
          />
        </div>
      ))}

      <BotonPersonalizado onClick={finalizar} disabled={false} variant="primary">
        Finalizar Test
      </BotonPersonalizado>
    </div>
  );
}