// components/Modal/Modal.tsx (El componente global)
import styles from "../Modal/Modal.module.css";
import type { ReactNode } from 'react'; // Importamos ReactNode para tipar el contenido

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string; // Título dinámico para el modal
  children: ReactNode; // Acepta cualquier contenido React como hijo
}

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
}: Props) {

  if (!abierto) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <div className={styles.modalHeader}>
            <h3>{titulo}</h3>
        </div>
        
        <div className={styles.modalBody}>
            {children} {/* Renderiza el contenido dinámico aquí */}
        </div>
        
      </div>
    </div>
  );
}
