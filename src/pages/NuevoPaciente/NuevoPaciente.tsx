import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";
import styles from "./NuevoPaciente.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";

export default function NuevoPaciente() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    fechaNacimiento: "",
    contacto: "",
    fechaIngreso: "",
    motivo: "",
    notasIniciales: "",
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const guardarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addDoc(collection(db, "pacientes"), {
        nombre: formData.nombre,
        fechaNacimiento: formData.fechaNacimiento,
        contacto: formData.contacto,
        fechaIngreso: formData.fechaIngreso
          ? Timestamp.fromDate(new Date(formData.fechaIngreso))
          : Timestamp.now(),
        motivo: formData.motivo,
        notasIniciales: formData.notasIniciales,
        sesiones: 0,
        createdAt: Timestamp.now(),
      });

      navigate("/pacientes");
    } catch (error) {
      console.error("Error guardando paciente:", error);
      alert("Ocurrió un error al guardar el paciente 😕");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`global-container ${styles.container}`}>
        <div className={styles.nav}>
            <h2>Registrar nuevo paciente</h2> 
                <BotonPersonalizado
                    variant="danger"
                    onClick={async () => {
                        if (confirm("¿Cancelar?")) {
                        navigate("/pacientes");
                        }
                    }}
                    disabled={false}
                    >
                    Cancelar
            </BotonPersonalizado>
        </div>
      

      <form className={styles.form} onSubmit={guardarPaciente}>

        <div className={styles.inputGroup}>

        <h2>Datos personales</h2>
        <h4><label>Nombre completo</label></h4>
        <input
          type="text"
          name="nombre"
          value={formData.nombre}
          onChange={handleChange}
          required
        />
         <h4><label>Contacto (email o teléfono)</label></h4>
        <input
          type="text"
          name="contacto"
          value={formData.contacto}
          onChange={handleChange}
        />
        </div>
<div className={styles.inputGroup}>
        <h4><label>Fecha de nacimiento</label></h4>
        <input
          type="date"
          name="fechaNacimiento"
          value={formData.fechaNacimiento}
          onChange={handleChange}
          required
        />
        </div>
<div className={styles.inputGroup}>
        <h2>Datos clínicos</h2>
        <h4><label>Fecha de ingreso</label></h4>
        <input
          type="date"
          name="fechaIngreso"
          value={formData.fechaIngreso}
          onChange={handleChange}
          required
        />
        </div>

        <div className={styles.inputGroup}>

        <h4><label>Motivo / Diagnóstico</label></h4>
        <input
          type="text"
          name="motivo"
          value={formData.motivo}
          onChange={handleChange}
        />
        </div>
        <div className={styles.inputGroup}>
        <h4><label>Notas iniciales</label></h4>
        <textarea
          name="notasIniciales"
          value={formData.notasIniciales}
          onChange={handleChange}
        />
</div>
        <BotonPersonalizado
          variant="primary"
          type="submit"
          disabled={loading}
        >
          {loading ? "Guardando..." : "Guardar paciente"}
        </BotonPersonalizado>
      </form>
    </div>
  );
}