import { useEffect, type ReactNode } from "react";
import styles from "./Modal.module.css";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  subtitulo?: string;
}

export default function Modal({
  abierto,
  onCerrar,
  titulo,
  children,
  subtitulo,
}: Props) {
  useEffect(() => {
    if (!abierto) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCerrar();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    const overflowAnterior = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = overflowAnterior;
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className={styles.modalOverlay}
      onMouseDown={onCerrar}
      role="presentation"
    >
      <div
        className={styles.modalContent}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalHeading}>
            <span className={styles.eyebrow}>
              Join Solution
            </span>

            <h2 id="modal-title">{titulo}</h2>

            {subtitulo && (
              <p className={styles.subtitle}>
                {subtitulo}
              </p>
            )}
          </div>

          <button
            type="button"
            className={styles.closeButton}
            onClick={onCerrar}
            aria-label="Cerrar"
            title="Cerrar"
          >
            ×
          </button>
        </div>

        <div className={styles.divider} />

        <div className={styles.modalBody}>
          {children}
        </div>
      </div>
    </div>
  );
}