import { useState } from "react";
import { useNavigate } from "react-router-dom";

import BotonPersonalizado from "../../components/Boton/Boton";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/images/logo.svg";
import { recuperarAccesoAdmin } from "../../firebase/admin";

import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);
  const [recovering, setRecovering] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async () => {
    setError("");
    setInfo("");

    if (!email.trim() || !password) {
      setError("Completá email y contraseña.");
      return;
    }

    try {
      setLoading(true);

      await login(
        email.trim().toLowerCase(),
        password,
      );

      localStorage.removeItem("paciente");
      localStorage.setItem("rol", "admin");

      navigate("/admin/dashboard");
    } catch {
      setError(
        "El email o la contraseña ingresados no son correctos.",
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     ENTER
  ======================================================= */

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      e.key === "Enter" &&
      email &&
      password &&
      !loading &&
      !recovering
    ) {
      void handleLogin();
    }
  };

  /* =======================================================
     RECUPERAR CONTRASEÑA
  ======================================================= */

  const handleForgotPassword = async () => {
    setError("");
    setInfo("");

    const emailLimpio =
      email.trim().toLowerCase();

    if (!emailLimpio) {
      setError(
        "Ingresá tu email para recibir las instrucciones de recuperación.",
      );

      return;
    }

    try {
      setRecovering(true);

      await recuperarAccesoAdmin({
        email: emailLimpio,
      });

      setInfo(
        "Si existe una cuenta administrativa asociada a ese email, recibirás un correo con las instrucciones para crear una nueva contraseña.",
      );
    } catch (error) {
      console.error(
        "Error solicitando recuperación:",
        error,
      );

      setInfo(
        "Si existe una cuenta administrativa asociada a ese email, recibirás un correo con las instrucciones para crear una nueva contraseña.",
      );
    } finally {
      setRecovering(false);
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <main className={styles.page}>
      {/* BACKGROUND */}

      <div
        className={styles.ambientBackground}
        aria-hidden="true"
      >
        <span
          className={`${styles.orb} ${styles.orbYellow}`}
        />

        <span
          className={`${styles.orb} ${styles.orbOrange}`}
        />

        <span
          className={`${styles.orb} ${styles.orbRed}`}
        />
      </div>

      <section className={styles.shell}>
        {/* =================================================
            PRESENTATION
        ================================================= */}

        <aside className={styles.presentation}>
          <header className={styles.brand}>
            <img
              src={Logo}
              alt="Join Solution"
              className={styles.logo}
            />

            <div className={styles.brandText}>
              <strong>JOIN SOLUTION</strong>

              <span>
                Plataforma de evaluaciones
              </span>
            </div>
          </header>

          <div className={styles.introduction}>
            <h1>
              Gestión
              clínica.
            </h1>

            <p className={styles.description}>
              Acceso al entorno profesional para la
              administración de pacientes, sesiones,
              evaluaciones y resultados.
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              

              <div>
                <strong>
                  Gestión centralizada
                </strong>

                <p>
                  Pacientes, sesiones y evaluaciones
                  desde un único entorno.
                </p>
              </div>
            </div>

            <div className={styles.feature}>
              

              <div>
                <strong>
                  Acceso restringido
                </strong>

                <p>
                  Área destinada al personal
                  autorizado.
                </p>
              </div>
            </div>
          </div>
        </aside>

        {/* =================================================
            LOGIN
        ================================================= */}

        <section className={styles.loginPanel}>
          <div className={styles.loginContent}>
{/*             <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/")}
              disabled={loading || recovering}
            >
              <span aria-hidden="true">←</span>
              Volver
            </button> */}

            <header className={styles.loginHeader}>
              <p className={styles.loginEyebrow}>
                ACCESO ADMINISTRATIVO
              </p>

              <h2>Bienvenido</h2>

              <p>
                Ingresá tus credenciales para
                continuar al panel de gestión.
              </p>
            </header>

            {/* FORM */}

            <div className={styles.form}>
              {/* EMAIL */}

              <div className={styles.field}>
                <label htmlFor="admin-email">
                  Email
                </label>

                <input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@joinsolution.com"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);

                    if (error) setError("");
                    if (info) setInfo("");
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={
                    loading || recovering
                  }
                />
              </div>

              {/* PASSWORD */}

              <div className={styles.field}>
                <div
                  className={
                    styles.passwordHeader
                  }
                >
                  <label htmlFor="admin-password">
                    Contraseña
                  </label>

                  <button
                    type="button"
                    className={
                      styles.forgotButton
                    }
                    onClick={
                      handleForgotPassword
                    }
                    disabled={
                      loading || recovering
                    }
                  >
                    {recovering
                      ? "Enviando..."
                      : "Olvidé mi contraseña"}
                  </button>
                </div>

                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);

                    if (error) setError("");
                    if (info) setInfo("");
                  }}
                  onKeyDown={handleKeyDown}
                  disabled={
                    loading || recovering
                  }
                />
              </div>

              {/* MESSAGES */}

              {error && (
                <div
                  className={`${styles.message} ${styles.errorMessage}`}
                  role="alert"
                >
                  <span
                    className={
                      styles.messageIndicator
                    }
                  />

                  <p>{error}</p>
                </div>
              )}

              {info && (
                <div
                  className={`${styles.message} ${styles.infoMessage}`}
                  role="status"
                >
                  <span
                    className={
                      styles.infoIndicator
                    }
                  />

                  <p>{info}</p>
                </div>
              )}

              {/* LOGIN */}

              <div
                className={
                  styles.primaryAction
                }
              >
                <BotonPersonalizado
                  variant="primary"
                  onClick={handleLogin}
                  disabled={
                    loading ||
                    recovering ||
                    !email.trim() ||
                    !password
                  }
                >
                  {loading
                    ? "Ingresando..."
                    : "Ingresar al panel"}
                </BotonPersonalizado>
              </div>
            </div>

            {/* OTHER ACCESS */}

            <div className={styles.divider}>
              <span />
              <p>Otro tipo de acceso</p>
              <span />
            </div>

            <button
              type="button"
              className={styles.patientAccess}
              onClick={() => navigate("/login")}
              disabled={loading || recovering}
            >
              <span
                className={
                  styles.patientAccessContent
                }
              >
                <strong>
                  ¿Sos paciente?
                </strong>

                <span>
                  Accedé a tus evaluaciones
                  asignadas.
                </span>
              </span>

              <span
                className={
                  styles.patientAccessAction
                }
              >
                Portal de pacientes

                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M5 12h13" />
                  <path d="m14 7 5 5-5 5" />
                </svg>
              </span>
            </button>

            <footer className={styles.footer}>
              <span
                className={
                  styles.securityDot
                }
              />

              <p>
                Acceso exclusivo para personal
                autorizado
              </p>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}