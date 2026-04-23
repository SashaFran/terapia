import { useState } from "react";
import { db, storage } from "../../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import styles from "./SubirDNI.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";


export default function SubirDNI() {
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

const CLOUD_NAME = "dni13rket"; // <--- Verificá que sea todo en minúsculas
  const UPLOAD_PRESET = "joinsolution_bucket"; // <--- Copialo tal cual del dashboard

  const handleUpload = async () => {
    if (!file) return alert("Seleccioná un archivo");

    const pacienteData = localStorage.getItem("paciente");
    if (!pacienteData) return alert("Sesión expirada");
    const paciente = JSON.parse(pacienteData);

    setSubiendo(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);
      
      // Con esto vinculamos la foto al ID del paciente en Cloudinary
      // El archivo se guardará en una carpeta "dnis" con el nombre del ID
      formData.append("public_id", paciente.id);
      formData.append("folder", "dnis"); 

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, // Quitamos "image/" para que sea más genérico (acepta PDF)
        { method: "POST", body: formData }
      );

      const data = await response.json();

      if (data.secure_url) {
        // Guardamos la URL y el ID de Cloudinary en tu Firestore
        await updateDoc(doc(db, "pacientes", paciente.id), {
          archivodni: data.secure_url, 
          dni_public_id: data.public_id, // Guardamos esto para rastreo extra
          activo: true,
          fecha_subida: new Date().toISOString()
        });

        alert("DNI vinculado al paciente con éxito ✨");
        setFile(null);
        setPreview(null);
      } else {
        // Esto te mostrará el error real en el alert si falla
        console.error("Detalle de Cloudinary:", data.error.message);
        alert(`Error de Cloudinary: ${data.error.message}`);
      }
    } catch (error) {
      console.error("Error técnico:", error);
      alert("Error de conexión al intentar subir el archivo.");
    } finally {
      setSubiendo(false);
    }
  };


  return (
    <div className={`global-container ${styles.container}`}>
      <div className="nav">
        <h2>Tu Documentación</h2>
      </div>

      <div className={styles.card}>
        <p className={styles.cardTitle}>Validación de Identidad</p>
        <p>
          Para garantizar la validez de los resultados, necesitamos confirmar la identidad 
          de la persona que realiza las evaluaciones.
        </p>

        <div className={styles.instrucciones}>
          <p className={styles.cardTitle}>Instrucciones:</p>
          <ul>
            <li><strong>Qué subir</strong>: Una imagen clara del frente de tu DNI.</li>
            <li><strong>Formato</strong>: JPG o JPEG.</li>
            <li><strong>Claridad</strong>: Asegurate de que los datos sean legibles.</li>
          </ul>
        </div>

        <small className={styles.disclaimer}>
          Tus datos serán tratados de forma confidencial y utilizados exclusivamente para este proceso.
        </small>

        <div className={styles.inputDNI}>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg"
            className={styles.fileInput}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <BotonPersonalizado
            variant="primary"
            disabled={subiendo || !file}
            onClick={handleUpload}
          >
            {subiendo ? "Subiendo archivo..." : "Subir y Habilitar Acceso"}
          </BotonPersonalizado>
        </div>
      </div>
    </div>
  );
}
