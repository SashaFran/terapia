import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db } from "../../firebase/firebase.js";
import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import EditarPacienteModal from "../../components/Modal/EditarPacienteModal.tsx";
import ObservacionesModal from "../../components/Modal/ObservacionesModal.tsx";
import styles from "./PacientePerfil.module.css";
import { descargarInforme } from "../../utils/descargarInforme";
import guardadoIcono from "../../assets/Icons/guardado.svg";


import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  Timestamp,
  where,
  updateDoc,
} from "firebase/firestore";

// -------- TYPES --------
interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
}

interface Paciente {
  activo: boolean;
  dni: string;
  fechaInicioAcceso: any;
  fechaFinAcceso: any;
  nombre: string;
}

interface Asignacion {
  id: string;
  testId: string;
  estado: "pendiente" | "completado";
  fechaAsignacion?: any;
  fechaCompletado?: any;
}

// -------- COMPONENT --------
export default function PacientePerfil() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [patient, setPatient] = useState<Paciente | null>(null);
  const [resultados, setResultados] = useState<Resultado[]>([]);
  const [asignaciones, setAsignaciones] = useState<Asignacion[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [selectedResultado, setSelectedResultado] = useState<Resultado | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // -------- HELPERS --------
  const formatearFecha = (timestamp: any) => {
    if (!timestamp) return "N/A";
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString("es-AR");
    if (timestamp instanceof Date) return timestamp.toLocaleDateString("es-AR");
    return "N/A";
  };

  const getEstadoPaciente = () => {
    if (!patient) return "—";

    const ahora = new Date();
    const fin = patient.fechaFinAcceso?.toDate?.();

    if (fin && ahora > fin) return "⛔ Expirado";
    if (patient.activo === false) return "⛔ Inactivo";

    const total = asignaciones.length;
    const completados = asignaciones.filter(a => a.estado === "completado").length;

    if (total > 0 && total === completados) return "✔️ Completado";

    return "🟢 Activo";
  };

  // -------- LOAD DATA --------
  useEffect(() => {
    if (!id) return;

    const load = async () => {
      const pacienteSnap = await getDoc(doc(db, "pacientes", id));
      if (pacienteSnap.exists()) setPatient(pacienteSnap.data() as Paciente);

      const resSnap = await getDocs(
        query(collection(db, "resultados"), where("pacienteId", "==", id))
      );
      setResultados(resSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Resultado[]);

      const asignSnap = await getDocs(
        query(collection(db, "asignaciones"), where("pacienteId", "==", id))
      );
      setAsignaciones(asignSnap.docs.map(d => ({ id: d.id, ...d.data() })) as Asignacion[]);
    };

    load();
  }, [id]);

  // -------- JOIN DATA --------
  useEffect(() => {
    const data = resultados.map(r => ({
      ...r,
      observacionesIniciales: r.observacionesIniciales || "—"
    }));

    data.sort((a, b) => {
      if (!a.fecha?.toDate || !b.fecha?.toDate) return 0;
      return b.fecha.toDate() - a.fecha.toDate();
    });

    setTableData(data);
  }, [resultados]);

  // -------- GUARDAR CONFIG (ARREGLADO) --------


const handleGuardarConfig = async (data: any) => {
  try {
    if (!id || !patient) return;

    const ref = doc(db, "pacientes", id);

    const updates: any = {};

    // 🟢 ACTIVO
    if (data.activo !== patient.activo) {
      updates.activo = data.activo;
    }

    // 📅 FECHA (string → Timestamp)
    if (data.fechaFinAcceso) {
      const nuevaFecha = new Date(data.fechaFinAcceso + "T00:00:00"); // 👈 FIX timezone
      const actualFecha = patient.fechaFinAcceso?.toDate?.();

      const distinta =
        !actualFecha || nuevaFecha.getTime() !== actualFecha.getTime();

      if (distinta) {
        updates.fechaFinAcceso = Timestamp.fromDate(nuevaFecha);
      }
    }

    // 🚀 UPDATE REAL
    if (Object.keys(updates).length > 0) {
      console.log("ACTUALIZANDO:", updates);
      await updateDoc(ref, updates);
    }

    // ---------------- TESTS ----------------
    if (data.tests) {
      const actuales = asignaciones.map(a => a.testId);

      const nuevos = data.tests.filter((t: string) => !actuales.includes(t));
      const eliminados = actuales.filter(t => !data.tests.includes(t));

      const ahora = new Date();

      await Promise.all([
        ...nuevos.map(testId =>
          addDoc(collection(db, "asignaciones"), {
            pacienteId: id,
            testId,
            estado: "pendiente",
            fechaAsignacion: Timestamp.fromDate(ahora),
          })
        ),
        ...asignaciones
          .filter(a => eliminados.includes(a.testId))
          .map(a => deleteDoc(doc(db, "asignaciones", a.id))),
      ]);

      const snap = await getDocs(
        query(collection(db, "asignaciones"), where("pacienteId", "==", id))
      );

      setAsignaciones(
        snap.docs.map(d => ({ id: d.id, ...d.data() })) as Asignacion[]
      );
    }

    // 🔄 estado local
    setPatient(prev =>
      prev
        ? {
            ...prev,
            ...updates,
          }
        : null
    );

    setIsConfigOpen(false);

  } catch (err) {
    console.error("Error guardando configuración:", err);
    alert("Error guardando configuración");
  }
};
  if (!patient) return <h2>Cargando...</h2>;

  // -------- UI --------
return (
  <div className={styles.container}>

    {/* HEADER */}
    <header className={styles.header}>
      <h2>{patient.nombre}</h2>
    </header>

    <div className={styles.layout}>

      {/* 👈 IZQUIERDA */}
      <div className={styles.sidebar}>
        
        <div className={styles.perfilInfo}>
          <p><strong>DNI:</strong> {patient.dni}</p>
          <p><strong>Estado:</strong> {getEstadoPaciente()}</p>
          <p>
            <strong>Acceso:</strong>{" "}
            {formatearFecha(patient.fechaInicioAcceso)} →{" "}
            {formatearFecha(patient.fechaFinAcceso)}
          </p>
          <BotonPersonalizado onClick={() => setIsConfigOpen(true)}>
          Configuración
        </BotonPersonalizado>
        
        </div>

        <BotonPersonalizado
          variant="danger"
          onClick={async () => {
            if (confirm("¿Eliminar paciente?")) {
              await deleteDoc(doc(db, "pacientes", id!));
              navigate("/admin/pacientes");
            }
          }}
        >
          Borrar paciente
        </BotonPersonalizado>

        

      </div>

      {/* 👉 DERECHA */}
      <div className={styles.content}>

        {/* TABLA 1 */}
        <div>
          <h4>Tests asignados</h4>
          <div className={styles.tablaPacientes}>
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Estado</th>
                  <th>Asignado</th>
                  <th>Completado</th>
                </tr>
              </thead>
              <tbody>
                {asignaciones.map(a => (
                  <tr key={a.id}>
                    <td>{a.testId}</td>
                    <td>{a.estado}</td>
                    <td>{formatearFecha(a.fechaAsignacion)}</td>
                    <td>{formatearFecha(a.fechaCompletado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* TABLA 2 */}
        <div>
          <h4>Evaluaciones</h4>
          <div className={styles.tablaPacientes}>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Test</th>
                  <th>Nivel</th>
                  <th>Comentario</th>
                  <th>PDF</th>
                </tr>
              </thead>
              <tbody>
                {tableData.map(r => (
                  <tr key={r.id}>
                    <td>{formatearFecha(r.fecha)}</td>
                    <td>{r.testId}</td>
                    <td>{r.nivel}</td>
                    <td>
                      <button onClick={() => {
                        setSelectedResultado(r);
                        setIsModalOpen(true);
                      }}>
                        📝
                      </button>
                    </td>
                    <td>
                      <button onClick={() => descargarInforme(r, patient)}>
                        <img src={guardadoIcono} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>

    {/* MODALES */}
    {isConfigOpen && (
      <EditarPacienteModal
        abierto={isConfigOpen}
        paciente={patient}
        asignacionesActuales={asignaciones.map(a => a.testId)}
        onCerrar={() => setIsConfigOpen(false)}
        onGuardar={handleGuardarConfig}
      />
    )}

    <ObservacionesModal
      abierto={isModalOpen}
      onCerrar={() => setIsModalOpen(false)}
      sesion={selectedResultado}
      onGuardarExitoso={() => {}}
    />
  </div>
)};