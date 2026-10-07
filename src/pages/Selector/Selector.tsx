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
        <span className={styles.ambientGlow} />
      </div>

      <section className={styles.shell}>
        {/* =====================================================
            PRESENTACIÓN
        ====================================================== */}

        <section className={styles.presentation}>
          <div className={styles.presentationTexture} aria-hidden="true" />

          <header className={styles.brand}>
            <img
              src={Logo}
              alt=""
              aria-hidden="true"
              className={styles.logo}
            />

            <div className={styles.brandText}>
              <strong>Join Solution</strong>
            </div>
          </header>

          <div className={styles.introduction}>

            <h1>
              Personas
              <br />
              correctas.
              <br />

              <span>
                Equipos que
                <br />
                crecen.
              </span>
            </h1>

            <p className={styles.description}>
              Evaluaciones psicológicas simples, humanas y respaldadas por
              datos.
            </p>
          </div>

          <div className={styles.presentationFooter}>
            <div className={styles.stat}>
              <strong>+2.400</strong>
              <span>evaluaciones completadas</span>
            </div>

            <div className={styles.stat}>
              <strong>98%</strong>
              <span>de procesos acompañados</span>
            </div>
          </div>

          <div className={styles.decorations} aria-hidden="true">
            <span className={styles.circleLarge} />
            <span className={styles.circleSmall} />
          </div>
        </section>

        {/* =====================================================
            ACCESO
        ====================================================== */}

        <section className={styles.access}>
          <div className={styles.accessInner}>
            <header className={styles.accessHeader}>
              <p className={styles.accessEyebrow}>Acceso a la plataforma</p>

              <h2>Hola, ¿cómo querés ingresar?</h2>

              <p>Elegí el espacio que corresponde a tu experiencia.</p>
            </header>

            <div className={styles.accessOptions}>
              {/* PACIENTE */}

              <button
                type="button"
                className={styles.accessCard}
                onClick={() => navigate("/login")}
              >
                <span
                  className={`${styles.cardIcon} ${styles.patientIcon}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <circle cx="9" cy="7" r="3" />
                    <path d="M3.5 19v-1.5A4.5 4.5 0 0 1 8 13h2a4.5 4.5 0 0 1 4.5 4.5V19" />
                    <path d="M16 8.5a2.5 2.5 0 1 1 0 5" />
                    <path d="M17.5 14.5A4 4 0 0 1 21 18.5V19" />
                  </svg>
                </span>

                <span className={styles.cardContent}>
                  <strong>Soy paciente</strong>

                  <span>Quiero realizar mis evaluaciones asignadas.</span>
                </span>

                <span
                  className={`${styles.cardArrow} ${styles.patientArrow}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12h13" />
                    <path d="m14 7 5 5-5 5" />
                  </svg>
                </span>
              </button>

              {/* EQUIPO */}

              <button
                type="button"
                className={styles.accessCard}
                onClick={() => navigate("/admin/login")}
              >
                <span
                  className={`${styles.cardIcon} ${styles.teamIcon}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <rect x="4" y="4" width="6" height="6" rx="1" />
                    <rect x="14" y="4" width="6" height="6" rx="1" />
                    <rect x="4" y="14" width="6" height="6" rx="1" />
                    <rect x="14" y="14" width="6" height="6" rx="1" />
                  </svg>
                </span>

                <span className={styles.cardContent}>
                  <strong>Soy parte del equipo</strong>

                  <span>Quiero gestionar pacientes y resultados.</span>
                </span>

                <span
                  className={`${styles.cardArrow} ${styles.teamArrow}`}
                  aria-hidden="true"
                >
                  <svg viewBox="0 0 24 24">
                    <path d="M5 12h13" />
                    <path d="m14 7 5 5-5 5" />
                  </svg>
                </span>
              </button>
            </div>

            <div className={styles.help}>
              <span className={styles.helpIcon} aria-hidden="true">
                ?
              </span>

              <span>¿No sabés cuál elegir?</span>

              <a href="mailto:acceso@joinsolution.com.ar">Contactanos</a>
            </div>
          </div>
        </section>
      </section>

      <footer className={styles.pageFooter}>
        © {new Date().getFullYear()} JoinSolution · Privacidad · Soporte
      </footer>
    </main>
  );
}