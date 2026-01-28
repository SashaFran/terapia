import { useEffect, useState } from "react";
import { db } from "../../firebase/firebase.jsx";
import styles from "./Pacientes.module.css";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from '../../components/Boton/Boton.tsx';
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

interface Paciente {
  id: string;
  nombre: string;
  fechaIngreso: string;
  sesiones: number;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const [pacientes, setPacientes] = useState<Paciente[]>([]);
    const [loading, setLoading] = useState(true);

    // ---------------------------------------
    // 🧡 Función segura para formatear fechas
    // ---------------------------------------
    const formatearFecha = (timestamp: any): string => {
        if (!timestamp) return "N/A";
        if (timestamp.toDate) {
            return timestamp
                .toDate()
                .toLocaleDateString("es-AR", {
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

    const guardarNuevoPaciente = async (e: React.FormEvent) => {
        navigate("/nuevo-paciente");
    };

    // ---------------------------------------
    // Cargar pacientes al montar componente
    // ---------------------------------------
    useEffect(() => {
        cargarPacientes();
    }, []);

    const cargarPacientes = async () => {
  try {
    const querySnapshot = await getDocs(collection(db, "pacientes"));

    const data = await Promise.all(
      querySnapshot.docs.map(async (docPaciente) => {
        const docData = docPaciente.data();

        // 🔥 CONTAMOS RESULTADOS DE ESTE PACIENTE
        const q = query(
          collection(db, "resultados"),
          where("pacienteId", "==", docPaciente.id)
        );
        const resultadosSnap = await getDocs(q);

        return {
          id: docPaciente.id,
          nombre: docData.nombre || "Sin nombre",
          fechaIngreso: formatearFecha(docData.fechaIngreso),
          sesiones: resultadosSnap.size, // 👈 ACÁ LA MAGIA
        };
      })
    );

    setPacientes(data);
  } catch (error) {
    console.error("Error al cargar pacientes: ", error);
  } finally {
    setLoading(false);
  }
};


    // ---------------------------------------
    // Render
    // ---------------------------------------

    if (loading) {
        return <div className={`global-container ${styles.container}`}><h2>Cargando pacientes...</h2></div>;
    }
    return (
        <div className={`global-container ${styles.container}`}>
            <div className={styles.nav}>
                <h2>Pacientes</h2> 
                <BotonPersonalizado variant="primary" onClick={guardarNuevoPaciente} disabled={false}>
                    Nuevo paciente
                </BotonPersonalizado>
            </div>

            <table className={styles.tablaPacientes}>
                <thead>
                    <tr>
                        <th>Nombre</th>
                        <th>Fecha Ingreso</th>
                        <th>Sesiones</th>
                        <th className={styles.centerAlign}>Acción</th>
                    </tr>
                </thead>

                <tbody>
                    {pacientes.map((paciente) => (
                        <tr key={paciente.id}>
                            <td>{paciente.nombre}</td>
                            <td>{paciente.fechaIngreso}</td>
                            <td >{paciente.sesiones}</td>
                            <td>
                                <BotonPersonalizado
                                    variant="secondary"
                                    onClick={() => navigate(`/perfil/${paciente.id}`)}>Ver
                                </BotonPersonalizado>
                            </td>

                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
} 
