import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  loginPatient,
  hasPatientAccess,
} from "../../../utils/patientAccess";

import {
  mensajeErrorPaciente,
} from "../../../firebase/pacientes";

import BotonPersonalizado from "../../../components/Boton/Boton";

import Logo from "../../../assets/images/logo.svg";

import styles from "./LoginPaciente.module.css";

export default function LoginPaciente() {
  const [accepted, setAccepted] =
    useState(false);

  const [dni, setDni] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const navigate = useNavigate();


  /* =======================================================
     SESIÓN EXISTENTE
  ======================================================= */

  useEffect(() => {
    if (hasPatientAccess()) {
      navigate("/app/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);


  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async (
    e?: FormEvent,
  ) => {
    e?.preventDefault();

    if (loading) return;

    setError("");

    const dniLimpio =
      dni.replace(/\D/g, "");

    if (!dniLimpio || !password) {
      setError(
        "Completá tu DNI y contraseña.",
      );

      return;
    }

    if (!accepted) {
      setError(
        "Debe leer y aceptar las condiciones de acceso antes de ingresar.",
      );

      return;
    }

    setLoading(true);

    try {
      await loginPatient(
        dniLimpio,
        password,
      );

      navigate("/app/dashboard");
    } catch (loginError) {
      setError(
        mensajeErrorPaciente(loginError),
      );
    } finally {
      setLoading(false);
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
        {/* =================================================
            PRESENTATION
        ================================================= */}

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
              Tu potencial,
              <br />

              <span>
                en movimiento.
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


        {/* =================================================
            LOGIN
        ================================================= */}

        <section className={styles.loginPanel}>
          <div className={styles.loginContent}>
            <button
              type="button"
              className={styles.backButton}
              onClick={() => navigate("/")}
              disabled={loading}
            >
              <span aria-hidden="true">←</span>

              Elegir otro acceso
            </button>

            <header className={styles.loginHeader}>
              <h2>
                Todo listo para comenzar.
              </h2>
            </header>


            {/* FORM */}

            <form
              className={styles.form}
              onSubmit={handleLogin}
            >
              {/* DNI */}

              <div className={styles.field}>
                <label htmlFor="paciente-dni">
                  DNI
                </label>

                <div className={styles.inputWrapper}>
                  <input
                    id="paciente-dni"
                    type="text"
                    inputMode="numeric"
                    autoComplete="username"
                    placeholder="Ingresá tu DNI"
                    value={dni}
                    onChange={(e) => {
                      setDni(e.target.value);

                      if (error) {
                        setError("");
                      }
                    }}
                    disabled={loading}
                  />

                  <span
                    className={styles.inputSuffix}
                    aria-hidden="true"
                  >
                    #
                  </span>
                </div>

                <span className={styles.fieldHelp}>
                  Sin puntos ni espacios.
                </span>
              </div>


              {/* PASSWORD */}

              <div className={styles.field}>
                <label htmlFor="paciente-password">
                  Contraseña
                </label>

                <div className={styles.inputWrapper}>
                  <input
                    id="paciente-password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Contraseña de acceso"
                    value={password}
                    onChange={(e) => {
                      setPassword(
                        e.target.value,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    disabled={loading}
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    disabled={loading}
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


              {/* ACCESS POLICY */}

              <section
                className={styles.accessPolicy}
                aria-label="Condiciones de acceso"
              >
                <div className={styles.policyHeader}>
                  <span
                    className={styles.policyIcon}
                    aria-hidden="true"
                  >
                    !
                  </span>

                  <div>
                    <strong>
                      Acceso de una sola sesión
                    </strong>

                    <span>
                      Reservá hasta 30 minutos por
                      evaluación.
                    </span>
                  </div>
                </div>

                <div className={styles.policyBody}>
                  <p>
                    Prepará una imagen frontal de tu
                    DNI y realizá el proceso desde una
                    computadora con cámara. Al cerrar
                    esta ventana, el acceso quedará
                    inhabilitado.
                  </p>
                </div>

                <label className={styles.consentRow}>
                  <input
                    type="checkbox"
                    checked={accepted}
                    onChange={(e) => {
                      setAccepted(
                        e.target.checked,
                      );

                      if (error) {
                        setError("");
                      }
                    }}
                    disabled={loading}
                  />

                  <span
                    className={styles.customCheckbox}
                    aria-hidden="true"
                  >
                    <svg viewBox="0 0 16 16">
                      <path d="m3.5 8.2 2.7 2.7 6.2-6.2" />
                    </svg>
                  </span>

                  <span className={styles.consentText}>
                    Leí las condiciones y estoy
                    listo/a para comenzar.
                  </span>
                </label>
              </section>


              {/* ERROR */}

              {error && (
                <div
                  className={styles.errorMessage}
                  role="alert"
                >
                  <span
                    className={styles.errorIndicator}
                  />

                  <p>{error}</p>
                </div>
              )}


              {/* LOGIN */}

              <div className={styles.primaryAction}>
                <BotonPersonalizado
                  variant="primary"
                  type="submit"
                  disabled={
                    loading ||
                    !accepted ||
                    !dni.trim() ||
                    !password
                  }
                >
                  {loading
                    ? "Ingresando..."
                    : "Ingresar a mis evaluaciones →"}
                </BotonPersonalizado>
              </div>
            </form>


            {/* TEAM ACCESS */}

            <button
              type="button"
              className={styles.adminAccess}
              onClick={() =>
                navigate("/admin/login")
              }
              disabled={loading}
            >
              <span
                className={styles.adminAccessContent}
              >
                <strong>
                  ¿Sos parte del equipo?
                </strong>

                <span>
                  Ingresá al panel administrativo
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
          </div>
        </section>
      </section>
            <footer className={styles.pageFooter}>
        © {new Date().getFullYear()} JoinSolution · Privacidad · Soporte
      </footer>
    </main>
  );
}