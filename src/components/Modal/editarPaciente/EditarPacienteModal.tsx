import { useState, useEffect } from "react";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../Modal";
import styles from "./EditarPacienteModal.module.css";
import noEntry from "../../../assets/Icons/no-entry(2).svg";
import { collection, addDoc, deleteDoc, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase/firebase";

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

  useEffect(() => {
    if (abierto && paciente) {
      setActivo(paciente.activo);
      setTestsSeleccionados(asignacionesActuales);

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

  const toggleTest = (testId: string) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter((t) => t !== testId)
        : [...prev, testId],
    );
  };


  const manejarGuardar = async () => {
    if (!paciente?.id) {
      console.error("No se encontró el ID del paciente para actualizar");
      return;
    }

    try {
      const dateObj = new Date(fechaFin.replace(/-/g, "\/"));
      const inicio = paciente?.fechaInicioAcceso?.toDate
        ? paciente.fechaInicioAcceso.toDate()
        : new Date(paciente?.fechaInicioAcceso);
      if (inicio instanceof Date && !Number.isNaN(inicio.getTime())) {
        const maxFin = new Date(inicio.getTime() + 24 * 60 * 60 * 1000);
        if (dateObj.getTime() > maxFin.getTime()) {
          alert("La fecha de fin no puede superar las 24 horas desde la fecha de inicio.");
          return;
        }
      }

      const pacienteRef = doc(db, "pacientes", paciente.id);

      await updateDoc(pacienteRef, {
        activo: activo,
        fechaFinAcceso: dateObj, // Firebase lo guardará como Timestamp
      });

const asignacionesSnap = await getDocs(
  query(collection(db, "asignaciones"), where("pacienteId", "==", paciente.id))
);

const actuales = asignacionesSnap.docs.map(doc => ({
  id: doc.id,
  testId: doc.data().testId
}));

const nuevos = testsSeleccionados.filter(
  test => !actuales.some(a => a.testId === test)
);

const eliminados = actuales.filter(
  a => !testsSeleccionados.includes(a.testId)
);

const crear = nuevos.map(testId =>
  addDoc(collection(db, "asignaciones"), {
    pacienteId: paciente.id,
    testId,
    estado: "pendiente",
    fechaAsignacion: new Date()
  })
);

const borrar = eliminados.map(a =>
  deleteDoc(doc(db, "asignaciones", a.id))
);

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
          {}
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

            {}
            <div className={styles.inputGroup}>
              <label>Fecha límite de acceso</label>
              <input
                type="date"
                value={fechaFin}
                onChange={(e) => setFechaFin(e.target.value)}
                min={
                  paciente?.fechaInicioAcceso
                    ? new Date(
                        (paciente.fechaInicioAcceso.toDate
                          ? paciente.fechaInicioAcceso.toDate()
                          : new Date(paciente.fechaInicioAcceso)
                        ).getTime(),
                      )
                        .toISOString()
                        .slice(0, 10)
                    : undefined
                }
              />
            </div>
          </div>

<h3>Tests asignados</h3>
          {}
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

        {}
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