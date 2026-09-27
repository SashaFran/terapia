import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase.jsx";
import styles from "./Pacientes.module.css";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../components/Boton/Boton.tsx";
import { collection, getDocs, query, where } from "firebase/firestore";
import { obtenerEstadisticasPacientes } from "../../utils/obtencion/obtenerEstadisticasPacientes.tsx";
import { obtenerMetricasPacientes } from "../../utils/obtencion/obtenerMetricasPacientes.tsx";
import NuevoPaciente from "../NuevoPaciente/NuevoPaciente.tsx";
import Modal from "../../components/Modal/Modal.tsx";

interface Paciente {
  id: string;
  nombre: string;
  fechaIngreso: string;
  testsAsignados: number;
  testsFinalizados: number;
}

export default function Dashboard() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);

  const [metricas, setMetricas] = useState({
    total: 0,
    nuevosSemana: 0,
    nuevosMes: 0,
  });

  const [stats, setStats] = useState({
    total: 0,
    activos: 0,
  });

  const guardarNuevoPaciente = () => {
    setShowModal(true);
  };

  const formatearFecha = (timestamp: any): string => {
    if (!timestamp) return "N/A";

    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString("es-AR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }

    return "N/A";
  };

  const cargarPacientes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "pacientes"));

      const data = await Promise.all(
        querySnapshot.docs.map(async (docPaciente) => {
          const docData = docPaciente.data();

          // Buscamos todos los tests asignados al paciente
          const q = query(
            collection(db, "asignaciones"),
            where("pacienteId", "==", docPaciente.id),
          );

          const asignacionesSnap = await getDocs(q);

          // Total de tests asignados
          const testsAsignados = asignacionesSnap.size;

          // Tests que ya fueron completados
          const testsFinalizados = asignacionesSnap.docs.filter(
            (docAsignacion) => docAsignacion.data().estado === "completado",
          ).length;

          return {
            id: docPaciente.id,
            nombre: docData.nombre || "Sin nombre",
            fechaIngreso: formatearFecha(docData.createdAt),
            testsAsignados,
            testsFinalizados,
          };
        }),
      );

      setPacientes(data);
    } catch (error) {
      console.error("Error al cargar pacientes: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargarPacientes();
  }, []);

  useEffect(() => {
    obtenerMetricasPacientes().then(setMetricas);
  }, []);

  useEffect(() => {
    obtenerEstadisticasPacientes().then(setStats);
  }, []);

  if (loading) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando pacientes...</h2>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.layout}>
        <div className="panelVertical">
          <BotonPersonalizado
            variant="primary"
            onClick={guardarNuevoPaciente}
            tooltip="Registrar un paciente y asignarle sus tests en el mismo paso."
            disabled={false}
          >
            Nuevo paciente
          </BotonPersonalizado>

          <div className={"card paddingHorizontal"}>
            <h1 className={"numero"}>{metricas.total}</h1>
            <p>Total Pacientes</p>
          </div>

          <div className="card paddingHorizontal">
            <h1 className={"numero"}>{metricas.nuevosSemana}</h1>
            <p>Pacientes esta semana</p>
          </div>

          <div className="card paddingHorizontal">
            <h1 className={"numero"}>{metricas.nuevosMes}</h1>
            <p>Pacientes este mes</p>
          </div>
        </div>

        <main className="scrollbar">
          <div className="tablaPacientes">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Fecha Ingreso</th>
                  <th>Tests asignados / finalizados</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {pacientes.map((paciente) => (
                  <tr key={paciente.id}>
                    <td>{paciente.nombre}</td>

                    <td>{paciente.fechaIngreso}</td>

                    <td>
                      {paciente.testsAsignados} / {paciente.testsFinalizados}
                    </td>

                    <td>
                      <BotonPersonalizado
                        variant="secondary"
                        onClick={() =>
                          navigate(`/admin/paciente/${paciente.id}`)
                        }
                        disabled={false}
                      >
                        Ver
                      </BotonPersonalizado>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {showModal && (
        <Modal
          abierto={true}
          onCerrar={() => setShowModal(false)}
          titulo="Registrar nuevo paciente"
        >
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <NuevoPaciente
                onClose={() => setShowModal(false)}
                onPacienteCreado={cargarPacientes}
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
