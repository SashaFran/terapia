//import { ReactNode } from "react";

import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../../Modal/Modal";
import ConsentimientoCamara from "../../Modal/CamaraModal/CamaraModal";

import styles from "./TestIntroModal.module.css";
import { useState } from "react";
import type { ReactNode } from "react";

type Instruccion = {
  titulo: string;
  texto: ReactNode;
};

type Props = {
  nombre: string;
  descripcion?: string;
  duracion?: string;
  instrucciones: Instruccion[];

  canStart: boolean;
  onConsentChange: (accepted: boolean) => void;
  onStart: () => void | Promise<void>;

  startDisabled?: boolean;
};

export default function TestIntroModal({
  nombre,
  descripcion = "Evaluación psicológica",
  duracion = "30 minutos",
  instrucciones,
  canStart,
  onConsentChange,
  onStart,
  startDisabled = false,
}: Props) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState("");
  const begin = async () => {
    if (starting) return;
    setStarting(true); setStartError("");
    try { await onStart(); }
    catch (error) { setStartError(error instanceof Error ? error.message : "No se pudo iniciar. Verifique la cámara y la conexión."); }
    finally { setStarting(false); }
  };
  return (
    <Modal
      abierto={true}
      onCerrar={() => {}}
      titulo=""
    >
      <div className={`${styles.intro}`}>
        {/* =============================================
            ENCABEZADO
        ============================================= */}

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>
              Evaluación asignada
            </span>

            <h2>{nombre}</h2>

            <p>{descripcion}</p>
          </div>

          <span className={styles.readyBadge}>
            <span />
            Preparación
          </span>
        </header>

        {/* =============================================
            RESUMEN
        ============================================= */}

        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span className={styles.summaryLabel}>
                Duración
              </span>

              <span
                className={styles.tooltip}
                tabIndex={0}
                aria-label="Información sobre la duración"
              >
                ?
                <span className={styles.tooltipContent}>
                  El tiempo comienza a correr cuando
                  seleccione “Comenzar evaluación”.
                </span>
              </span>
            </div>

            <strong>{duracion}</strong>

            <p>
              Tiempo disponible para completar la
              evaluación.
            </p>
          </div>

          <div className={styles.summaryCard}>
            <div className={styles.summaryTop}>
              <span className={styles.summaryLabel}>
                Verificación
              </span>

              <span
                className={styles.tooltip}
                tabIndex={0}
                aria-label="Información sobre la verificación de identidad"
              >
                ?
                <span className={styles.tooltipContent}>
                  Durante la evaluación podrán realizarse
                  capturas mediante la cámara para validar
                  la identidad del participante.
                </span>
              </span>
            </div>

            <strong>Identidad</strong>

            <p>
              Se solicitará acceso a la cámara durante la
              evaluación.
            </p>
          </div>
        </div>

        {/* =============================================
            INSTRUCCIONES
        ============================================= */}

        <section className={`${styles.instructions}`}>
          <div className={styles.sectionHeading}>
            <span className={styles.sectionEyebrow}>
              Antes de comenzar
            </span>

            <h3>
              Lea atentamente las indicaciones
            </h3>

            <p>
              Asegúrese de comprender las instrucciones
              antes de iniciar la evaluación.
            </p>
          </div>

          <div className={styles.instructionsList}>
            {instrucciones.map((instruccion, index) => (
              <article
                className={styles.instruction}
                key={`${instruccion.titulo}-${index}`}
              >
                <span className={styles.instructionNumber}>
                  {String(index + 1).padStart(2, "0")}
                </span>

                <div>
                  <h4>{instruccion.titulo}</h4>

                  <div className={styles.instructionText}>
                    {instruccion.texto}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* =============================================
            CONSENTIMIENTO
        ============================================= */}

        <p className="access-policy">Al comenzar, mantenga esta pantalla activa. Si cambia de pestaña o ventana, tendrá 2 minutos para regresar. Salir del test lo marcará como abandonado. Cerrar sesión o esta ventana inhabilita toda la cuenta.</p>
        {startError && <p role="alert">{startError}</p>}
        <ConsentimientoCamara
          changeStatus={onConsentChange}
        />

        {/* =============================================
            ACCIÓN
        ============================================= */}

        <footer className={styles.footer}>
          <div className={styles.footerInfo}>
            <span
              className={
                canStart
                  ? styles.statusDotReady
                  : styles.statusDotPending
              }
            />

            <p>
              {canStart
                ? "Consentimiento registrado. Puede comenzar la evaluación."
                : "Debe aceptar la verificación de identidad para continuar."}
            </p>
          </div>

          <div className={styles.action}>
            <BotonPersonalizado
              variant="primary"
              onClick={() => void begin()}
              disabled={!canStart || startDisabled || starting}
            >
              {starting ? "Verificando acceso y cámara…" : "Comenzar evaluación"}
            </BotonPersonalizado>
          </div>
        </footer>
      </div>
    </Modal>
  );
}