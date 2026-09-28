import { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";

import Modal from "./Modal";
import BotonPersonalizado from "../Boton/Boton";

import { db } from "../../firebase/firebase";

import styles from "./ObservacionesModal.module.css";

interface Props {
  abierto: boolean;

  onCerrar: () => void;

  sesion: {
    id: string;
    observacionesIniciales?: string;
  } | null;

  onGuardarExitoso: (
    id: string,
    nuevasObservaciones: string,
  ) => void;
}

export default function ObservacionesModal({
  abierto,
  onCerrar,
  sesion,
  onGuardarExitoso,
}: Props) {
  const [editText, setEditText] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (abierto && sesion) {
      setEditText(
        sesion.observacionesIniciales || "",
      );
    }
  }, [abierto, sesion]);

  const handleSave = async () => {
    if (!sesion?.id) return;

    setSaving(true);

    try {
      await updateDoc(
        doc(db, "resultados", sesion.id),
        {
          observacionesIniciales: editText,
        },
      );
    } catch (error) {
      console.error(
        "Error REAL guardando en Firebase:",
        error,
      );

      alert(
        "No se pudo guardar en la base de datos.",
      );

      setSaving(false);
      return;
    }

    try {
      onGuardarExitoso(
        sesion.id,
        editText,
      );

      onCerrar();
    } catch (uiError) {
      console.warn(
        "Guardado OK, error solo de UI:",
        uiError,
      );

      onCerrar();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      abierto={abierto}
      onCerrar={saving ? () => {} : onCerrar}
      titulo="Observaciones de la sesión"
      subtitulo="Añadí o editá las notas asociadas a esta evaluación."
    >
      <div className={styles.form}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="observaciones">
              Observaciones
            </label>

            <span>
              {editText.length} caracteres
            </span>
          </div>

          <textarea
            id="observaciones"
            value={editText}
            onChange={(event) =>
              setEditText(event.target.value)
            }
            rows={7}
            className={styles.textarea}
            placeholder="Escribí las observaciones de la sesión..."
            disabled={saving}
          />
        </div>

        <div className={styles.actions}>
                    <BotonPersonalizado
            variant="primary"
            onClick={handleSave}
            disabled={saving || !sesion?.id}
          >
            {saving
              ? "Guardando..."
              : "Guardar observaciones"}
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