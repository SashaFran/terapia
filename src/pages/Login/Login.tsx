import {
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import BotonPersonalizado from "../../components/Boton/Boton";
import { useAuth } from "../../context/AuthContext";
import Logo from "../../assets/images/logo.svg";
import { recuperarAccesoAdmin } from "../../firebase/admin";

import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  const [loading, setLoading] =
    useState(false);

  const [recovering, setRecovering] =
    useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();


  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (
    event?: FormEvent,
  ) => {
    event?.preventDefault();

    if (loading || recovering) return;

    setError("");
    setInfo("");

    if (!email.trim() || !password) {
      setError(
        "Completá email y contraseña.",
      );

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
    } catch (recoveryError) {
      console.error(
        "Error solicitando recuperación:",
        recoveryError,
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
      <div
        className={styles.ambientBackground}
        aria-hidden="true"
      >
        <span className={styles.ambientGlow} />
      </div>

      <section className={styles.shell}>
        {/* ===============================================
            PRESENTATION
        =============================================== */}

        <aside className={styles.presentation}>
          <div
            className={styles.presentationTexture}
            aria-hidden="true"
          />

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
              Talento claro.
              <br />

              <span>
                Decisiones
                <br />
                mejores.
              </span>
            </h1>
          </div>

          <div className={styles.presentationFooter}>
            <div className={styles.stat}>
              <strong>+2.400</strong>

              <span>
                evaluaciones completadas
              </span>
            </div>

            <div className={styles.stat}>
              <strong>98%</strong>

              <span>
                de procesos acompañados
              </span>
            </div>
          </div>

          <div
            className={styles.decorations}
            aria-hidden="true"
          >
            <span className={styles.circleLarge} />
            <span className={styles.circleSmall} />
          </div>
        </aside>


        {/* ===============================================
            LOGIN
        =============================================== */}

        <section className={styles.loginPanel}>
          <div className={styles.loginContent}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/")}
              disabled={loading || recovering}
            >
              <span aria-hidden="true">←</span>

              Elegir otro acceso
            </button>

            <header className={styles.loginHeader}>

              <h2>
                Bienvenido de nuevo.
              </h2>
            </header>


            {/* FORM */}

            <form
              className={styles.form}
              onSubmit={handleLogin}
            >
              {/* EMAIL */}

              <div className={styles.field}>
                <label htmlFor="admin-email">
                  Email
                </label>

                <div className={styles.inputWrapper}>
                  <input
                    id="admin-email"
                    type="email"
                    autoComplete="email"
                    placeholder="nombre@empresa.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);

                      if (error) setError("");
                      if (info) setInfo("");
                    }}
                    disabled={
                      loading || recovering
                    }
                  />

                  <span
                    className={styles.inputSuffix}
                    aria-hidden="true"
                  >
                    @
                  </span>
                </div>
              </div>


              {/* PASSWORD */}

              <div className={styles.field}>
                <div
                  className={styles.passwordHeader}
                >
                  <label htmlFor="admin-password">
                    Contraseña
                  </label>

                  <button
                    type="button"
                    className={styles.forgotButton}
                    onClick={handleForgotPassword}
                    disabled={
                      loading || recovering
                    }
                  >
                    {recovering
                      ? "Enviando..."
                      : "Olvidé mi contraseña"}
                  </button>
                </div>

                <div className={styles.inputWrapper}>
                  <input
                    id="admin-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Ingresá tu contraseña"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);

                      if (error) setError("");
                      if (info) setInfo("");
                    }}
                    disabled={
                      loading || recovering
                    }
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    disabled={
                      loading || recovering
                    }
                    aria-label={
                      showPassword
                        ? "Ocultar contraseña"
                        : "Mostrar contraseña"
                    }
                  >
                    {showPassword
                      ? "Ocultar"
                      : "Mostrar"}
                  </button>
                </div>
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

              <div className={styles.primaryAction}>
                <BotonPersonalizado
                  variant="primary"
                  type="submit"
                  disabled={
                    loading ||
                    recovering ||
                    !email.trim() ||
                    !password
                  }
                >
                  {loading
                    ? "Ingresando..."
                    : "Ingresar al panel →"}
                </BotonPersonalizado>
              </div>
            </form>


            {/* OTHER ACCESS */}

            <div className={styles.divider}>
              <span />

              <p>o ingresá como</p>

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
                <strong>Paciente</strong>

                <span>
                  Accedé a tus evaluaciones
                </span>
              </span>

              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M5 12h13" />
                <path d="m14 7 5 5-5 5" />
              </svg>
            </button>


            <footer className={styles.footer}>
              <span
                className={styles.securityDot}
              />

              <p>
                Acceso exclusivo para personal
                autorizado
              </p>
            </footer>
          </div>
        </section>
      </section>
            <footer className={styles.pageFooter}>
        © {new Date().getFullYear()} JoinSolution · Privacidad · Soporte
      </footer>
    </main>
  );
}