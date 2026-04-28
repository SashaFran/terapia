import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, Timestamp, doc, setDoc } from "firebase/firestore";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { db, auth } from "../../firebase/firebase";
import styles from "./NuevoPaciente.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";

// 🧠 Tests disponibles
const TESTS_DISPONIBLES = [
  { id: "k10", nombre: "Escala K10" },
  { id: "bfq", nombre: "Personalidad BFQ" },
  { id: "laminas", nombre: "Láminas Zulliger/Bender" },
  { id: "raven", nombre: "Raven Abreviado" },
];

export default function NuevoPaciente() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    contacto: "",
  });

  const [testsSeleccionados, setTestsSeleccionados] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const toggleTest = (testId: string) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter((t) => t !== testId)
        : [...prev, testId]
    );
  };

  const guardarPaciente = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dniLimpio = formData.dni.trim().replace(/\D/g, "");

      if (dniLimpio.length < 4) {
        alert("El DNI debe tener al menos 4 números");
        setLoading(false);
        return;
      }

      if (testsSeleccionados.length === 0) {
        alert("Asigná al menos un test 🧠");
        setLoading(false);
        return;
      }

      const email = `${dniLimpio}@paciente.com`;
      const password = dniLimpio.slice(-6);
      const ahora = new Date();

      // 🔐 CREAR USUARIO AUTH
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );

      const uid = userCredential.user.uid;

      // 🧠 GUARDAR PACIENTE (ID = UID para mantener consistencia en toda la app)
      await setDoc(doc(db, "pacientes", uid), {
        uid,
        nombre: formData.nombre,
        dni: dniLimpio,
        password: password, // 👈 ACÁ ESTÁ LA CLAVE
        contacto: formData.contacto,
        activo: true,
        fechaInicioAcceso: Timestamp.fromDate(ahora),
        fechaFinAcceso: Timestamp.fromDate(
          new Date(ahora.getTime() + 24 * 60 * 60 * 1000)
        ),
        createdAt: Timestamp.now(),
      });

      // 🧠 ASIGNACIONES
      await Promise.all(
        testsSeleccionados.map((testId) =>
          addDoc(collection(db, "asignaciones"), {
            pacienteId: uid,
            testId,
            estado: "pendiente",
            fechaAsignacion: Timestamp.fromDate(ahora),
            fechaCompletado: null,
          })
        )
      );

      // 🚪 IMPORTANTE: volver a estado limpio
      await signOut(auth);

      alert(`✅ Paciente creado\nDNI: ${dniLimpio}\nClave: ${password}`);
      navigate("/admin/pacientes");

    } catch (error: any) {
      console.error(error);

      if (error.code === "auth/email-already-in-use") {
        alert("Ese paciente ya existe 💔");
      } else {
        alert("Error al crear paciente 😕");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`global-container ${styles.container}`}>
      {/* HEADER */}
      <div className={styles.nav}>
        <h2>Registrar nuevo paciente</h2>

        <BotonPersonalizado
          variant="danger"
          onClick={() => {
            if (confirm("¿Cancelar?")) navigate("/admin/pacientes");
          }}
          disabled={false}
        >
          Cancelar
        </BotonPersonalizado>
      </div>

      {/* FORM */}
      <form className={styles.form} onSubmit={guardarPaciente}>
        <div className={styles.inputGroup}>
          <h2>Datos de Acceso</h2>

          <input
            type="text"
            name="nombre"
            placeholder="Nombre completo"
            value={formData.nombre}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="dni"
            placeholder="DNI"
            value={formData.dni}
            onChange={handleChange}
            required
          />

          {formData.dni.length >= 6 && (
            <small>
              🔑 Contraseña: <strong>{formData.dni.slice(-6)}</strong>
            </small>
          )}

          <input
            type="text"
            name="contacto"
            placeholder="Contacto"
            value={formData.contacto}
            onChange={handleChange}
          />
        </div>

        <div className={styles.inputGroup}>
          <h2>Asignación de Tests</h2>

          <div className={styles.testsCheckboxes}>
            {TESTS_DISPONIBLES.map((test) => (
              <label key={test.id}>
                <input
                  type="checkbox"
                  checked={testsSeleccionados.includes(test.id)}
                  onChange={() => toggleTest(test.id)}
                />
                {test.nombre}
              </label>
            ))}
          </div>
        </div>

        <BotonPersonalizado type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear paciente"}
        </BotonPersonalizado>
      </form>
    </div>
  );
}
