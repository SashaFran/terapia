import { useState, useEffect } from "react";
import BotonPersonalizado from "../Boton/Boton";
import Modal from "../Modal/Modal";
import styles from "../Modal/EditarPacienteModal.module.css";
import { Timestamp } from "firebase/firestore";

// Tests disponibles
const TESTS_DISPONIBLES = [
  { id: "k10", nombre: "Escala K-10" },
  { id: "bfq", nombre: "Escala BFQ" },
  { id: "laminas", nombre: "Láminas Zulliger" },
  { id: "raven", nombre: "Test de Raven" },
];

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (data: any) => void;
  paciente: any;
  asignacionesActuales?: string[]; // 👈 ahora opcional para evitar errores
}

export default function EditarPacienteModal({
  abierto,
  onCerrar,
  onGuardar,
  paciente,
  asignacionesActuales = [],
}: Props) {
  const [activo, setActivo] = useState(true);
  const [fechaFin, setFechaFin] = useState("");
  const [testsSeleccionados, setTestsSeleccionados] = useState<string[]>([]);

  // ---------------------------
  // Sync inicial
  // ---------------------------
  useEffect(() => {
    if (abierto && paciente) {
      setActivo(paciente.activo);
      setTestsSeleccionados(asignacionesActuales);
      
      // 🔥 Convertimos el Timestamp a STRING YYYY-MM-DD para el input
      if (paciente.fechaFinAcceso?.toDate) {
        const date = paciente.fechaFinAcceso.toDate();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        setFechaFin(`${year}-${month}-${day}`); // Ahora sí es un string
      }
    }
  }, [abierto, paciente, asignacionesActuales]);


  // ---------------------------
  // Toggle test
  // ---------------------------
  const toggleTest = (testId: string) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter((t) => t !== testId)
        : [...prev, testId]
    );
  };

  // ---------------------------
  // Guardar
  // ---------------------------

const manejarGuardar = () => {
  // permitir guardar aunque no cambie todo
  if (!fechaFin && testsSeleccionados.length === 0 && activo === paciente.activo) {
    alert("Debes cambiar al menos un campo");
    return;
  }

  onGuardar({
    activo,
    fechaFinAcceso: fechaFin || null, // 👈 string YYYY-MM-DD o null
    tests: testsSeleccionados,
  });
};

  if (!abierto) return null;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Configurar paciente: ${paciente?.nombre || ""}`}
    >
      <div className={styles.inputContainer}>
        
        {/* ESTADO */}
        <div className={styles.inputGroup}>
          <h3>Estado del Acceso</h3>
          <select
            value={activo ? "true" : "false"}
            onChange={(e) => setActivo(e.target.value === "true")}
          >
            <option value="true">🟢 Activo</option>
            <option value="false">⛔ Inactivo</option>
          </select>
        </div>

        {/* FECHA */}
        <div className={styles.inputGroup}>
          <label>Fecha límite de acceso</label>
          <input
            type="date"
            value={fechaFin}
            onChange={(e) => setFechaFin(e.target.value)}
          />
        </div>

        {/* TESTS */}
        <div className={styles.inputGroup}>
          <h3>Tests asignados</h3>
          <div className={styles.testsGrid}>
            {TESTS_DISPONIBLES.map((test) => (
              <label key={test.id} className={styles.testCheckbox}>
                <input
                  type="checkbox"
                  checked={testsSeleccionados.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                />
                <span>{test.nombre}</span>
              </label>
            ))}
          </div>
        </div>

        {/* BOTONES */}
        <div className={styles.modalButtons}>
          <BotonPersonalizado
            variant="primary"
            onClick={manejarGuardar}
            disabled={false}
          >
            Guardar cambios
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