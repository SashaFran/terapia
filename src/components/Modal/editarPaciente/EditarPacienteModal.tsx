import { useState, useEffect } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../Modal";
import styles from "./editarPacienteModal.module.css";
import noEntry from "../../../assets/Icons/no-entry(2).svg";
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

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
  // 🔥 Convertimos el Timestamp de Firebase a un Date de JS, y luego a String para el input
  useEffect(() => {
    if (abierto && paciente) {
      setActivo(paciente.activo);
      setTestsSeleccionados(asignacionesActuales);

      // Si la fecha es null, ponemos un string vacío para el input
      if (paciente.fechaFinAcceso) {
        const date = paciente.fechaFinAcceso.toDate
          ? paciente.fechaFinAcceso.toDate()
          : new Date(paciente.fechaFinAcceso);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        setFechaFin(`${year}-${month}-${day}`);
      } else {
        setFechaFin(""); // Input vacío si no hay fecha en la BBDD
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
        : [...prev, testId],
    );
  };

  // ---------------------------
  // Guardar
  // ---------------------------

  const manejarGuardar = async () => {
    // 1. Verificación de seguridad
    if (!paciente?.id) {
      console.error("No se encontró el ID del paciente para actualizar");
      return;
    }

    try {
      // 2. Convertir el string del input "YYYY-MM-DD" a objeto Date
      // Usamos el reemplazo de guiones por barras para evitar el error de zona horaria que resta un día
      const dateObj = new Date(fechaFin.replace(/-/g, "\/"));

      // 3. Crear la referencia correcta
      const pacienteRef = doc(db, "pacientes", paciente.id);

      await updateDoc(pacienteRef, {
        activo: activo,
        fechaFinAcceso: dateObj, // Firebase lo guardará como Timestamp
      });
      // 🔥 SINCRONIZAR TESTS

// 1. Traer asignaciones actuales desde Firebase
const asignacionesSnap = await getDocs(
  query(collection(db, "asignaciones"), where("pacienteId", "==", paciente.id))
);

const actuales = asignacionesSnap.docs.map(doc => ({
  id: doc.id,
  testId: doc.data().testId
}));

// 2. Detectar cuáles agregar
const nuevos = testsSeleccionados.filter(
  test => !actuales.some(a => a.testId === test)
);

// 3. Detectar cuáles eliminar
const eliminados = actuales.filter(
  a => !testsSeleccionados.includes(a.testId)
);

// 4. Crear nuevos
const crear = nuevos.map(testId =>
  addDoc(collection(db, "asignaciones"), {
    pacienteId: paciente.id,
    testId,
    estado: "pendiente",
    fechaAsignacion: new Date()
  })
);

// 5. Borrar eliminados
const borrar = eliminados.map(a =>
  deleteDoc(doc(db, "asignaciones", a.id))
);

// 6. Ejecutar todo
await Promise.all([...crear, ...borrar]);
      onGuardar({
        activo,
        fechaFinAcceso: dateObj,
        testsSeleccionados, // 🔥 ESTE ES EL QUE FALTABA
      });
      onCerrar();
    } catch (error) {
      console.error("Error al guardar:", error);
    }
  };

  if (!abierto) return null;

  return (
    <Modal
      abierto={abierto}
      onCerrar={onCerrar}
      titulo={`Configurar paciente: ${paciente?.nombre || ""}`}
    >
      <div className={styles.inputContainer}>
        <div className="container">
          {/* ESTADO */}
          <h3>Estado del Acceso</h3>
          <div className={`nav ${styles.estadoContainer}`}>
            <div className={styles.inputGroup}>
              <label>Usuario</label>
              <select
                value={activo ? "true" : "false"}
                onChange={(e) => setActivo(e.target.value === "true")}
              >
                <option value="true">🟢 Activo</option>
                <option value="false">🔴 Inactivo</option>
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
          </div>

<h3>Tests asignados</h3>
          {/* TESTS */}
          <div className={styles.inputGroup}>
            
            <div className={styles.testsGrid}>
              {TESTS_DISPONIBLES.map((test) => (
                <label key={test.id} className={styles.testCheckbox}>
                  <input
                    type="checkbox"
                    checked={testsSeleccionados.includes(test.id)}
                    onChange={() => toggleTest(test.id)}
                  />
                  <p>{test.nombre}</p>
                </label>
              ))}
            </div>
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
