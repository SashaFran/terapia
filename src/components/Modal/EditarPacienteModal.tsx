// components/EditarPacienteModal/EditarPacienteModal.tsx (El wrapper específico)
import { useState, useEffect } from "react";
import BotonPersonalizado from "../Boton/Boton";
import Modal from "../Modal/Modal"; // 👈 Importamos el nuevo modal genérico
import styles from "../Modal/EditarPacienteModal.module.css"; // Aún puedes usar los estilos para los botones internos

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (data: { nombre: string; contacto: string }) => void;
  paciente: {
    nombre: string;
    contacto: string;
  };
}

export default function EditarPacienteModal({
  abierto,
  onCerrar,
  onGuardar,
  paciente,
}: Props) {
  const [form, setForm] = useState({
    nombre: "",
    contacto: "",
  });

  useEffect(() => {
    if (abierto) {
      setForm({
        nombre: paciente.nombre,
        contacto: paciente.contacto,
      });
    }
  }, [abierto, paciente]);

  // Ya no necesitamos la lógica de `if (!abierto) return null;` ni el HTML del overlay aquí.

  return (
    <Modal 
      abierto={abierto} 
      onCerrar={onCerrar} 
      titulo="Editar paciente" 
    >

      <div className={styles.inputContainer}>
        <div className={styles.inputGroup}>
          <label>Nombre</label>
          <input
            type="text"
            value={form.nombre}
            onChange={(e) => setForm({ ...form, nombre: e.target.value })}
          />
        </div>
        <div className={styles.inputGroup}>
          <label>Contacto</label>
          <input
            type="text"
            value={form.contacto}
            onChange={(e) => setForm({ ...form, contacto: e.target.value })}
          />
        </div>
        <div className={styles.modalButtons}>
        <BotonPersonalizado
          variant="primary"
          onClick={() => onGuardar(form)}
          disabled={false}
        >
          Guardar
        </BotonPersonalizado>

        <BotonPersonalizado
          variant="secondary"
          onClick={onCerrar}
          disabled={false}
        >
          Cancelar
        </BotonPersonalizado>
      </div>
      </div>
      
    </Modal>
  );
}
