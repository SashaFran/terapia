import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../../assets/images/logo.svg";

import styles from "./Selector.module.css";

export default function Selector() {
  const navigate = useNavigate();

  useEffect(() => {
    const paciente = localStorage.getItem("paciente");

    if (paciente) {
      navigate("/app/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);

  return (
    <main className={styles.page}>
      <div className={styles.ambientBackground} aria-hidden="true">
        <span className={`${styles.orb} ${styles.orbYellow}`} />
        <span className={`${styles.orb} ${styles.orbOrange}`} />
        <span className={`${styles.orb} ${styles.orbRed}`} />
      </div>
      <section className={styles.shell}>
        {/* =====================================================
            BRAND / PRESENTATION
        ====================================================== */}

        <section className={styles.presentation}>
          <header className={styles.brand}>
            <img src={Logo} alt="Join Solution" className={styles.logo} />

            <div className={styles.brandText}>
              <strong>JOIN SOLUTION</strong>
              <span>Plataforma de evaluaciones</span>
            </div>
          </header>

          <div className={styles.introduction}>
            <h1>
              Evaluaciones
              <br />
              psicológicas.
            </h1>

            <p className={styles.description}>
              Un entorno digital para gestionar y realizar evaluaciones
              psicológicas de forma organizada, simple y segura.
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              <div>
                <strong>Entorno protegido</strong>
                <p>Acceso diferenciado según el perfil.</p>
              </div>
            </div>

            <div className={styles.feature}>
              <div>
                <strong>Seguimiento centralizado</strong>
                <p>Evaluaciones, sesiones y resultados.</p>
              </div>
            </div>
          </div>
        </section>

        {/* =====================================================
            ACCESS
        ====================================================== */}

        <section className={styles.access}>
          <div className={styles.accessHeader}>
            <p className={styles.accessEyebrow}>ACCESO</p>

            <h2>Bienvenido</h2>

            <p>Seleccioná cómo querés ingresar a la plataforma.</p>
          </div>

          <div className={styles.accessOptions}>
            {/* PACIENTE */}

            <button
              type="button"
              className={`${styles.accessCard} ${styles.patientCard}`}
              onClick={() => navigate("/login")}
            >
              <span className={styles.cardAccent} />

              <span className={styles.cardContent}>
                <strong className={styles.cardTitle}>Paciente</strong>

                <span className={styles.cardDescription}>
                  Accedé a tus evaluaciones asignadas y consultá tu actividad
                  dentro de la plataforma.
                </span>
              </span>

              <span className={styles.cardMeta}>
                <span>Evaluaciones asignadas</span>

                <span>Seguimiento de progreso</span>
              </span>

              <span className={styles.cardAction}>
                <span>Ingresar como paciente</span>

                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              </span>
            </button>

            {/* ADMINISTRACIÓN */}

            <button
              type="button"
              className={`${styles.accessCard} ${styles.adminCard}`}
              onClick={() => navigate("/admin/login")}
            >
              <span className={styles.cardAccent} />

              <span className={styles.cardContent}>
                <strong className={styles.cardTitle}>Administración</strong>

                <span className={styles.cardDescription}>
                  Gestioná pacientes, sesiones, evaluaciones y resultados desde
                  el panel profesional.
                </span>
              </span>

              <span className={styles.cardMeta}>
                <span>Gestión de pacientes</span>

                <span>Sesiones y resultados</span>
              </span>

              <span className={styles.cardAction}>
                <span>Ingresar al panel</span>

                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M5 12h13" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              </span>
            </button>
          </div>
        </section>
      </section>
    </main>
  );
}
