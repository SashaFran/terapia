import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import Logo from "../../assets/images/logo.svg";

import styles from "./Selector.module.css";

export default function Selector() {
  const navigate = useNavigate();

  useEffect(() => {
    const paciente =
      localStorage.getItem("paciente");

    if (paciente) {
      navigate("/app/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);

  return (
    <main className={styles.page}>
      <div
        className={styles.backgroundGlow}
        aria-hidden="true"
      />

      <section className={styles.selectorCard}>
        {/* HEADER */}

        <header className={styles.header}>
          <div className={styles.logoWrapper}>
            <img
              src={Logo}
              alt="Join Solution"
              className={styles.logo}
            />
          </div>

          <p className={styles.eyebrow}>
            Join Solution
          </p>

          <h1>Bienvenido</h1>

          <p className={styles.subtitle}>
            Seleccioná el tipo de acceso para
            continuar a la plataforma.
          </p>
        </header>

        {/* ACCESOS */}

        <div className={styles.accessGrid}>
          {/* PACIENTE */}

          <article className={styles.accessCard}>
            <div className={styles.cardTop}>
              <span className={styles.cardNumber}>
                01
              </span>

              <span
                className={styles.arrow}
                aria-hidden="true"
              >
                →
              </span>
            </div>

            <div className={styles.cardBody}>
              <div
                className={`${styles.iconBox} ${styles.patientIcon}`}
                aria-hidden="true"
              >
                <span />
              </div>

              <div className={styles.cardText}>
                <h2>Paciente</h2>

                <p>
                  Accedé a tus evaluaciones
                  asignadas y documentación.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.accessButton}
              onClick={() =>
                navigate("/login")
              }
            >
              <span>
                Ingresar como paciente
              </span>

              <span aria-hidden="true">
                →
              </span>
            </button>
          </article>

          {/* ADMINISTRACIÓN */}

          <article className={styles.accessCard}>
            <div className={styles.cardTop}>
              <span className={styles.cardNumber}>
                02
              </span>

              <span
                className={styles.arrow}
                aria-hidden="true"
              >
                →
              </span>
            </div>

            <div className={styles.cardBody}>
              <div
                className={`${styles.iconBox} ${styles.adminIcon}`}
                aria-hidden="true"
              >
                <span />
                <span />
              </div>

              <div className={styles.cardText}>
                <h2>Administración</h2>

                <p>
                  Gestioná pacientes, sesiones
                  y resultados desde el panel.
                </p>
              </div>
            </div>

            <button
              type="button"
              className={styles.accessButton}
              onClick={() =>
                navigate("/admin/login")
              }
            >
              <span>
                Ingresar al panel
              </span>

              <span aria-hidden="true">
                →
              </span>
            </button>
          </article>
        </div>

        {/* FOOTER */}

        <footer className={styles.footer}>
          <span className={styles.securityDot} />

          <p>
            Plataforma de evaluaciones ·
            Join Solution
          </p>
        </footer>
      </section>
    </main>
  );
}