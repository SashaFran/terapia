import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db } from "../../../firebase/firebase";
import { doc, updateDoc } from "firebase/firestore";
import styles from "./SubirDNI.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";
import LoadingState from "../../../components/Loading/LoadingState";

export default function SubirDNI() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [dniUrl, setDniUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const pacienteData = localStorage.getItem("paciente");

    if (!pacienteData) {
      navigate("/login");
      return;
    }

    try {
      const paciente = JSON.parse(pacienteData);

      setDniUrl(paciente.archivodni || null);
    } catch {
      navigate("/login");
      return;
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  const formatearPeso = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const seleccionarArchivo = (archivo: File | null) => {
    setError("");
    setUploadSuccess(false);

    if (!archivo) {
      setFile(null);
      return;
    }

    const formatosPermitidos = [
      "image/jpeg",
      "image/jpg",
      "image/png",
    ];

    if (!formatosPermitidos.includes(archivo.type)) {
      setFile(null);
      setError(
        "El archivo debe ser una imagen en formato JPG, JPEG o PNG.",
      );
      return;
    }

    const limite = 10 * 1024 * 1024;

    if (archivo.size > limite) {
      setFile(null);
      setError(
        "La imagen no puede superar los 10 MB.",
      );
      return;
    }

    setFile(archivo);
  };

  const handleUpload = async () => {
    const CLOUD_NAME = "dni13rket";

    if (!file) {
      setError("Seleccioná una imagen de tu DNI.");
      return;
    }

    const pacienteData = localStorage.getItem("paciente");

    if (!pacienteData) {
      navigate("/login");
      return;
    }

    const paciente = JSON.parse(pacienteData);

    setSubiendo(true);
    setError("");

    try {
      if (paciente.dni_public_id) {
        fetch(
          "http://localhost:3001/api/delete-cloudinary",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              public_id: paciente.dni_public_id,
            }),
          },
        ).catch(() => undefined);
      }

      const formData = new FormData();

      formData.append("file", file);
      formData.append(
        "upload_preset",
        "joinsolution_bucket",
      );

      const resCloud = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await resCloud.json();

      if (data.error) {
        throw new Error(data.error.message);
      }

      const nuevoEstado = {
        ...paciente,
        archivodni: data.secure_url,
        dni_public_id: data.public_id,
      };

      await updateDoc(
        doc(db, "pacientes", paciente.id),
        {
          archivodni: nuevoEstado.archivodni,
          dni_public_id:
            nuevoEstado.dni_public_id,
        },
      );

      localStorage.setItem(
        "paciente",
        JSON.stringify(nuevoEstado),
      );

      setDniUrl(data.secure_url);
      setFile(null);
      setUploadSuccess(true);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (e: any) {
      console.error("Error al subir DNI:", e);

      setError(
        "No pudimos cargar el documento. Intentá nuevamente.",
      );
    } finally {
      setSubiendo(false);
    }
  };

  if (loading) {
    return <LoadingState message="Cargando tu documentación..." />;
  }

  return (
    <div className={styles.container}>
      {/* ENCABEZADO */}
      <header className={styles.header}>
        <span className={styles.eyebrow}>
          DOCUMENTACIÓN
        </span>

        <h1>Validación de identidad</h1>

        <p>
          Antes de comenzar tus evaluaciones necesitamos
          validar tu identidad. El proceso lleva menos de
          un minuto.
        </p>
      </header>

      {/* SI EL DNI YA ESTÁ CARGADO */}
      {dniUrl && !uploadSuccess ? (
        <section className={styles.documentReady}>
          <div className={styles.successIcon}>
            ✓
          </div>

          <div className={styles.documentReadyContent}>
            <span className={styles.successLabel}>
              DOCUMENTACIÓN RECIBIDA
            </span>

            <h2>Tu DNI ya fue cargado</h2>

            <p>
              El documento quedó asociado correctamente
              a tu perfil. Ya podés continuar con las
              evaluaciones asignadas.
            </p>
          </div>

          <div className={styles.readyActions}>
            <BotonPersonalizado
              variant="primary"
              onClick={() => navigate("/app/tests")}
              disabled={false}
            >
              Ir a mis evaluaciones
            </BotonPersonalizado>

            <button
              type="button"
              className={styles.replaceButton}
              onClick={() => {
                setDniUrl(null);
                setUploadSuccess(false);
              }}
            >
              Reemplazar documento
            </button>
          </div>
        </section>
      ) : uploadSuccess ? (
        /* ÉXITO INMEDIATO DESPUÉS DE SUBIR */
        <section className={styles.uploadComplete}>
          <div className={styles.successIconLarge}>
            ✓
          </div>

          <span className={styles.successLabel}>
            CARGA COMPLETADA
          </span>

          <h2>Documento recibido correctamente</h2>

          <p>
            Tu DNI quedó asociado a tu perfil. Ya podés
            comenzar las evaluaciones que te fueron
            asignadas.
          </p>

          <div className={styles.successActions}>
            <BotonPersonalizado
              variant="primary"
              onClick={() => navigate("/app/tests")}
              disabled={false}
            >
              Continuar a evaluaciones
            </BotonPersonalizado>

            <BotonPersonalizado
              variant="secondary"
              onClick={() => navigate("/app/dashboard")}
              disabled={false}
            >
              Volver al inicio
            </BotonPersonalizado>
          </div>
        </section>
      ) : (
        <>
          {/* INFORMACIÓN */}
          <section className={styles.infoGrid}>
            <article className={styles.infoItem}>
              <span>01</span>

              <div>
                <h3>Documento</h3>
                <p>Frente de tu DNI.</p>
              </div>
            </article>

            <article className={styles.infoItem}>
              <span>02</span>

              <div>
                <h3>Formato</h3>
                <p>Imagen JPG, JPEG o PNG.</p>
              </div>
            </article>

            <article className={styles.infoItem}>
              <span>03</span>

              <div>
                <h3>Calidad</h3>
                <p>
                  La información debe verse completa y
                  legible.
                </p>
              </div>
            </article>
          </section>

          {/* CARGA */}
          <section className={styles.uploadCard}>
            <div className={styles.uploadHeader}>
              <span className={styles.sectionLabel}>
                CARGAR DOCUMENTO
              </span>

              <h2>Frente del DNI</h2>

              <p>
                Seleccioná una imagen clara de tu
                documento desde este dispositivo.
              </p>
            </div>

            <input
              ref={inputRef}
              id="dni-file"
              type="file"
              accept=".jpg,.jpeg,.png,image/jpeg,image/png"
              className={styles.hiddenInput}
              onChange={(e) =>
                seleccionarArchivo(
                  e.target.files?.[0] || null,
                )
              }
            />

            <label
              htmlFor="dni-file"
              className={`${styles.dropArea} ${
                file ? styles.fileSelected : ""
              }`}
            >
              {file ? (
                <>
                  <div className={styles.fileIcon}>
                    JPG
                  </div>

                  <div className={styles.fileInfo}>
                    <strong>{file.name}</strong>

                    <span>
                      {formatearPeso(file.size)}
                    </span>
                  </div>

                  <span className={styles.changeFile}>
                    Cambiar
                  </span>
                </>
              ) : (
                <>
                  <div className={styles.uploadIcon}>
                    ↑
                  </div>

                  <div className={styles.selectText}>
                    <strong>
                      Seleccionar imagen
                    </strong>

                    <span>
                      JPG, JPEG o PNG · Máximo 10 MB
                    </span>
                  </div>
                </>
              )}
            </label>

            {error && (
              <div className={styles.errorMessage}>
                {error}
              </div>
            )}

            <div className={styles.uploadFooter}>
              <div className={styles.privacy}>
                <span className={styles.lock}>
                  ●
                </span>

                <p>
                  Tu documentación será utilizada
                  únicamente para validar tu identidad y
                  será tratada de forma confidencial.
                </p>
              </div>

              <BotonPersonalizado
                variant="primary"
                disabled={subiendo || !file}
                onClick={handleUpload}
              >
                {subiendo
                  ? "Cargando…"
                  : "Confirmar y subir"}
              </BotonPersonalizado>
            </div>
          </section>
        </>
      )}
    </div>
  );
}