import { useState } from "react";
import styles from "./TestBender.module.css";

type Props = {
  src: string;
};

export default function RotatableImage({ src }: Props) {
  const [rotation, setRotation] = useState(0);

  const handleDrag = (e: React.MouseEvent) => {
    setRotation((prev) => prev + e.movementX);
  };

  return (
    <img
      src={src}
      onMouseMove={(e) => e.buttons === 1 && handleDrag(e)}
      className={styles.img}
      style={{
        transform: `rotate(${rotation}deg)`,
        transition: "transform 0.1s",
      }}
      
    />
  );
}