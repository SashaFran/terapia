import { useState, useRef } from "react";
import { ZULLIGER_TEST } from "../../../data/tests/zulliger_test";
import RotatableImage from "./RotatableImage";
import BotonPersonalizado from "../../Boton/Boton";
import styles from "./TestZulliger.module.css";

type Props = {
  onChange: (respuestasParciales: any) => void;
};

export default function TestZulliger({ onChange }: Props) {
  const [respuestas, setRespuestas] = useState<string[]>(
    Array(ZULLIGER_TEST.imagenes.length).fill("")
  );

  const startTimeRef = useRef<number>(Date.now());

const handleChange = (index: number, texto: string) => {
  const copy = [...respuestas];
  copy[index] = texto;
  setRespuestas(copy);

  onChange(copy); // 🔥 ACTUALIZA EN TIEMPO REAL
};
const finalizar = () => {
  onChange(respuestas); // 👈 SOLO ARRAY
};
  return (
    <div className={styles.container}>
      <h3>{ZULLIGER_TEST.nombre}</h3>

      {ZULLIGER_TEST.imagenes.map((img, i) => (
        <div key={i} className={styles.containerImg}>
          <RotatableImage src={img} />

          <textarea
            placeholder="¿Qué ves en esta lámina?"
            value={respuestas[i]}
            onChange={(e) => handleChange(i, e.target.value)}
            className={styles.textarea}            
          />
        </div>
      ))}

      <BotonPersonalizado onClick={finalizar} disabled={false} variant="primary">
        Finalizar Test
      </BotonPersonalizado>
    </div>
  );
}