import { useEffect, useState } from "react";
import { db } from "../../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import styles from "./SubirDNI.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";

export default function SubirDNI() {
  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [dniUrl, setDniUrl] = useState<string | null>(null);

  useEffect(() => {
    const pacienteData = localStorage.getItem("paciente");
    if (!pacienteData) return;
    const paciente = JSON.parse(pacienteData);
    setDniUrl(paciente.archivodni || null);
  }, []);

  const handleUpload = async () => {
    const CLOUD_NAME = "dni13rket";
    if (!file) return alert("Seleccioná un archivo");

    const pacienteData = localStorage.getItem("paciente");
    if (!pacienteData) return alert("Sesión expirada");
    const paciente = JSON.parse(pacienteData);

    setSubiendo(true);

    try {
      // 1. DISPARAR BORRADO (Sin 'await' crítico)
      // Lo lanzamos y si falla, que falle solo, no nos detiene.
      if (paciente.dni_public_id) {
        fetch("http://localhost:3001/api/delete-cloudinary", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_id: paciente.dni_public_id }),
        }).catch((err) =>
          console.log("El borrado falló silenciosamente, normal en localhost."),
        );
      }

      // 2. SUBIR NUEVA IMAGEN (Lógica de Cloudinary API directa)
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "joinsolution_bucket");

      const resCloud = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        { method: "POST", body: formData },
      );

      const data = await resCloud.json();
      if (data.error) throw new Error(data.error.message);

      // 3. ACTUALIZAR FIREBASE Y LOCALSTORAGE
      const nuevoEstado = {
        ...paciente,
        archivodni: data.secure_url,
        dni_public_id: data.public_id,
      };

      await updateDoc(doc(db, "pacientes", paciente.id), {
        archivodni: nuevoEstado.archivodni,
        dni_public_id: nuevoEstado.dni_public_id,
      });

      localStorage.setItem("paciente", JSON.stringify(nuevoEstado));
      setDniUrl(data.secure_url);
      setFile(null);
      alert("¡DNI cargado con éxito! ✨");
    } catch (e: any) {
      alert(`Error al subir: ${e.message}`);
    } finally {
      setSubiendo(false);
    }
  };
  return (
    <div className="container">
      <div className="layout">
        {/* PANEL */}
        <div className="panelVertical">
          <div className={`card panelVertical ${styles.cardPaciente}`}>
            <h2>Tu Documentación</h2>

            {dniUrl ? (
              <div className={styles.sidebar}>
                <a href={dniUrl} target="_blank">
                  <p> Ver / Descargar DNI </p>
                </a>
              </div>
            ) : (
              <p>No hay DNI cargado</p>
            )}
          </div>
        </div>

        {/* SUBIDA */}
        <div
          className={`container card padding justify-content-space-around ${styles.containerDNI}`}
        >
          <h2>Validación de Identidad</h2>

          <p>
            Para garantizar la validez de los resultados, necesitamos confirmar
            la identidad de la persona que realiza las evaluaciones.
          </p>

          <div className="layout">
            <h2>Instrucciones:</h2>
            <ul>
              <li>
                <strong>Qué subir</strong>: Frente del DNI
              </li>
              <li>
                <strong>Formato</strong>: JPG o JPEG
              </li>
              <li>
                <strong>Claridad</strong>: Datos legibles
              </li>
            </ul>
          </div>
          
          <div className="layout justify-content-space-evenly">
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
              {subiendo ? "Subiendo..." : "Subir DNI"}
            </BotonPersonalizado>
          </div><small className={styles.disclaimer}>
            Tus datos serán tratados de forma confidencial.
          </small>
        </div>
      </div>
    </div>
  );
}
