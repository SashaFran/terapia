import { useState } from "react";
import { db } from "../../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import styles from "./SubirDNI.module.css"
import BotonPersonalizado from "../../../components/Boton/Boton";

export default function SubirDNI() {
  const [file, setFile] = useState<any>(null);

  const handleUpload = async () => {
    const paciente = JSON.parse(localStorage.getItem("paciente") || "{}");

    if (!file) return alert("Subí un archivo");

    // 🔥 SIMPLIFICADO (luego podemos usar Firebase Storage)
    const fakeUrl = URL.createObjectURL(file);
    await updateDoc(doc(db, "pacientes", paciente.id), {
      fechaFinAcceso: new Date(Date.now() + 24 * 60 * 60 * 1000),
      activo: true
    });

    await updateDoc(doc(db, "pacientes", paciente.id), {
      archivoDNI: fakeUrl,
    });

    alert("DNI subido");
  };

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>Tu Documentación</h2>
      </div>
      <div className={styles.card}>
        <p className={styles.cardTitle}>Validación de Identidad</p>
        <p className={styles.cardTitle}>¿Por qué solicitamos tu documentación?</p>
        <p>Para garantizar la validez y transparencia de los resultados, necesitamos confirmar la identidad de la persona que realiza las evaluaciones. De esta forma, nos aseguramos de que el proceso sea seguro y oficial.
        Instrucciones para la subida:</p>
        <ul>
          <li> <strong>Qué subir</strong>: Únicamente necesitamos una imagen clara del dorso de tu DNI.</li>
          <li><strong>Formato</strong>: Podés adjuntar el archivo en formato JPG, JPEG o PDF.</li>
          <li><strong>Claridad</strong>: Asegurate de que los datos sean legibles y que no haya reflejos de luz que tapen la información.</li>
        </ul>
        <p className={styles.cardTitle}>Pasos para completar el registro:</p>
        <ul>
          <li>Hacé clic en el botón <strong>"Seleccionar archivo"</strong> o arrastrá el documento al recuadro.</li>
          <li>Una vez que veas el nombre de tu archivo en pantalla, el sistema lo procesará automáticamente.</li>
          <li>Al finalizar la subida, se habilitará el acceso a los tests.</li>
        </ul>
        <small>Tus datos serán tratados de forma confidencial y utilizados exclusivamente para este proceso de evaluación.</small>
      
        <div className={styles.inputDNI}>
          <input
            type="file"
            accept=".pdf,.jpg,.jpeg"
            onChange={(e) => setFile(e.target.files?.[0])}
          />

          <BotonPersonalizado
            variant="primary"
            disabled={false}
            onClick={handleUpload}
          >
            Subir
          </BotonPersonalizado>
        </div>
      </div>
    </div>
  );
}