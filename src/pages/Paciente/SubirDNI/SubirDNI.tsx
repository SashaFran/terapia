import { useState } from "react";
import { db, storage } from "../../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes } from "firebase/storage";
import styles from "./SubirDNI.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";

export default function SubirDNI() {
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);

const handleUpload = async () => {
  if (!file) return alert("Seleccioná un archivo");
  
  const pacienteData = localStorage.getItem("paciente");
  if (!pacienteData) return alert("Sesión expirada");
  const paciente = JSON.parse(pacienteData);

  setSubiendo(true);

  try {
    // Referencia limpia
    const storageRef = ref(storage, `test_${Date.now()}.jpg`);

    // Forzamos metadatos básicos para ayudar al servidor
    const metadata = {
      contentType: file.type,
    };

    console.log("Subiendo archivo de tipo:", file.type);

    // Intentamos la subida
    const snapshot = await uploadBytes(storageRef, file, metadata);
    console.log("Subida exitosa:", snapshot.metadata.fullPath);

    // Actualizamos Firestore
    await updateDoc(doc(db, "pacientes", paciente.id), {
      archivodni: snapshot.metadata.fullPath,
      activo: true
    });

    alert("DNI subido con éxito");

  } catch (error: any) {
    console.error("Error detallado:", error);
    // Si el error es 404, es un problema de configuración en la consola de Firebase
    if (error.code === 'storage/object-not-found') {
       alert("Error: El servidor de almacenamiento no está activo en Firebase.");
    } else {
       alert("Error de conexión: Revisá tu configuración de CORS o red.");
    }
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
            <li><strong>Qué subir</strong>: Una imagen clara del dorso o frente de tu DNI.</li>
            <li><strong>Formato</strong>: JPG, JPEG o PDF.</li>
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
