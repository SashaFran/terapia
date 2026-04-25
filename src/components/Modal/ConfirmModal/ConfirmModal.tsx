import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../Modal";
import styles from "./confirmModal.module.css";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  mensaje: string;
  warning?: string;
  onConfirm: () => Promise<void> | void;
  loading?: boolean;
}

export default function ConfirmModal({
  abierto,
  onCerrar,
  titulo,
  mensaje,
  warning,
  onConfirm,
  loading = false,
}: Props) {
  return (
    <Modal abierto={abierto} onCerrar={onCerrar} titulo={titulo}>
      <div className={`container ${styles.container}`}>        
        <p>{mensaje}</p>
        {warning && (
          <p className={styles.warning}>
            {warning}
          </p>
        )}
        </div>
        <div className="nav">          
          <BotonPersonalizado
            variant="secondary"
            onClick={onCerrar}
            disabled={loading}
          >
            Cancelar
          </BotonPersonalizado>
          <BotonPersonalizado
            variant="danger"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? "Procesando..." : "Confirmar"}
          </BotonPersonalizado>
        </div>      
    </Modal>
  );
}