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
  sesiones: number;
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

  const [formData, setFormData] = useState({
    nombre: "",
    apellido: "",
    dni: "",
    fechaNacimiento: "",
    contacto: "",
    motivo: "",
    notasIniciales: "",
  });
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    cargarPacientes();
  }, []);

  const cargarPacientes = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "pacientes"));

      const data = await Promise.all(
        querySnapshot.docs.map(async (docPaciente) => {
          const docData = docPaciente.data();

          const q = query(
            collection(db, "resultados"),
            where("pacienteId", "==", docPaciente.id),
          );
          const resultadosSnap = await getDocs(q);

          return {
            id: docPaciente.id,
            nombre: docData.nombre || "Sin nombre",
            fechaIngreso: formatearFecha(docData.createdAt),
            sesiones: resultadosSnap.size, // 👈 ACÁ LA MAGIA
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
  const [stats, setStats] = useState({ total: 0, activos: 0 });

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
        <div className={"panelVertical"}>
          <BotonPersonalizado
            variant="primary"
            onClick={guardarNuevoPaciente}
            disabled={false}
          >
            Nuevo paciente
          </BotonPersonalizado>
          <div className="card paddingHorizontal">
            <h4>Total Pacientes</h4>
            <p className={styles.numero}>{metricas.total}</p>
          </div>

          <div className="card paddingHorizontal">
            <h4>Pacientes esta semana</h4>
            <p className={styles.numero}>{metricas.nuevosSemana}</p>
          </div>

          <div className="card paddingHorizontal">
            <h4>Pacientes este mes</h4>
            <p className={styles.numero}>{metricas.nuevosMes}</p>
          </div>
        </div>
        <main className={`scrollbar`}>
          <div className="tablaPacientes">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Fecha Ingreso</th>
                  <th>Sesiones</th>
                  <th>Acción</th>
                </tr>
              </thead>

              <tbody>
                {pacientes.map((paciente) => (
                  <tr key={paciente.id}>
                    <td>{paciente.nombre}</td>
                    <td>{paciente.fechaIngreso}</td>
                    <td>{paciente.sesiones}</td>
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
        <Modal abierto={true} onCerrar={() => {}} titulo="">
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