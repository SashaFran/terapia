// components/ObservacionesModal/ObservacionesModal.tsx
import { useState, useEffect } from "react";
import Modal from "../Modal/Modal";
import BotonPersonalizado from "../Boton/Boton";
import { db } from "../../firebase/firebase";
import styles from "../Modal/EditarPacienteModal.module.css";
import { doc, updateDoc } from "firebase/firestore";

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  sesion: {
    id: string;
    observacionesIniciales?: string;
  } | null;
  onGuardarExitoso: (id: string, nuevasObservaciones: string) => void;
}

export default function ObservacionesModal({
  abierto,
  onCerrar,
  sesion,
  onGuardarExitoso,
}: Props) {
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  // Sync cuando se abre o cambia el resultado
  useEffect(() => {
    if (abierto && sesion) {
      setEditText(sesion.observacionesIniciales || "");
    }
  }, [abierto, sesion]);

  const handleSave = async () => {
    if (!sesion?.id) return;

    setSaving(true);

    try {
      await updateDoc(doc(db, "resultados", sesion.id), {
        observacionesIniciales: editText,
      });
    } catch (error) {
      console.error("Error REAL guardando en Firebase:", error);
      alert("No se pudo guardar en la base de datos.");
      setSaving(false);
      return;
    }

    // 👇 A PARTIR DE ACÁ: solo UI (NO puede romper Firebase)
    try {
      onGuardarExitoso(sesion.id, editText);
      onCerrar();
    } catch (uiError) {
      console.warn("Guardado OK, error solo de UI:", uiError);
      onCerrar(); // igual cerramos
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo="Observaciones de la sesión"
    >
      <p className={styles.inputGroup}>Edita o añade notas para esta sesión.</p>

      <div className={styles.inputContainer}>
        <textarea
          value={editText}
          onChange={(e) => setEditText(e.target.value)}
          rows={6}
          className={styles.inputGroup}
          placeholder="Añade tus observaciones aquí..."
        />

        <div className={styles.modalButtons}>
          <BotonPersonalizado
            variant="primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar"}
          </BotonPersonalizado>

          <BotonPersonalizado
            variant="secondary"
            onClick={onCerrar}
            disabled={saving}
          >
            Cancelar
          </BotonPersonalizado>
        </div>
      </div>
    </Modal>
  );
}
