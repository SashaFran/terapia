import { useEffect, useState } from "react";
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
    e?: React.FormEvent,
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
              <strong>
                JOIN SOLUTION
              </strong>

              <span>
                Plataforma de evaluaciones
              </span>
            </div>
          </header>

          <div className={styles.introduction}>
            <h1>
              Tus
              <br />
              evaluaciones.
            </h1>

            <p className={styles.description}>
              Un espacio preparado para que
              realices tus evaluaciones de forma
              simple, guiada y organizada.
            </p>
          </div>

          <div className={styles.features}>
            <div className={styles.feature}>
              <div>
                <strong>
                  Evaluaciones asignadas
                </strong>

                <p>
                  Accedé únicamente a las
                  evaluaciones preparadas para vos.
                </p>
              </div>
            </div>

            <div className={styles.feature}>
              <div>
                <strong>
                  Proceso acompañado
                </strong>

                <p>
                  Encontrarás las indicaciones
                  necesarias antes de comenzar
                  cada evaluación.
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
            <header className={styles.loginHeader}>
              <p className={styles.loginEyebrow}>
                ACCESO A EVALUACIONES
              </p>

              <h2>Bienvenido</h2>

              <p>
                Ingresá con los datos que
                recibiste para acceder a tus
                evaluaciones.
              </p>
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
                  className={styles.fieldHelp}
                >
                  Ingresalo sin puntos ni
                  espacios.
                </span>
              </div>

              {/* PASSWORD */}

              <div className={styles.field}>
                <label
                  htmlFor="paciente-password"
                >
                  Contraseña
                </label>

                <input
                  id="paciente-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Ingresá tu contraseña"
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

                <span
                  className={styles.fieldHelp}
                >
                  Usá la contraseña incluida
                  en tu correo de acceso.
                </span>
              </div>

              {/* ACCESS POLICY */}

              <section
                className={styles.accessPolicy}
                aria-label="Condiciones de acceso"
              >
                <div
                  className={
                    styles.policyHeader
                  }
                >
                  <span
                    className={
                      styles.policyIcon
                    }
                    aria-hidden="true"
                  >
                    !
                  </span>

                  <div>
                    <strong>
                      Acceso de una sola sesión
                    </strong>

                    <span>
                      Información importante
                      antes de ingresar
                    </span>
                  </div>
                </div>

                <div
                  className={styles.policyBody}
                >
                  <p>
                    Al cerrar sesión, cerrar esta
                    pestaña o ventana, o recargar
                    la página, su cuenta quedará
                    inhabilitada. No podrá volver
                    a ingresar ni completar las
                    evaluaciones pendientes.
                  </p>

                  <p>
                    Antes de ingresar, prepare la
                    imagen frontal de su DNI
                    (JPG, JPEG o PNG) y una
                    computadora con cámara.
                    Reserve hasta 30 minutos por
                    evaluación.
                  </p>
                </div>

                <label
                  className={
                    styles.consentRow
                  }
                >
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
                    className={
                      styles.customCheckbox
                    }
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 16 16"
                    >
                      <path d="m3.5 8.2 2.7 2.7 6.2-6.2" />
                    </svg>
                  </span>

                  <span
                    className={
                      styles.consentText
                    }
                  >
                    He leído las condiciones y
                    estoy listo/a para completar
                    las evaluaciones.
                  </span>
                </label>
              </section>

              {/* ERROR */}

              {error && (
                <div
                  className={
                    styles.errorMessage
                  }
                  role="alert"
                >
                  <span
                    className={
                      styles.errorIndicator
                    }
                  />

                  <p>{error}</p>
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
                    : "Ingresar a mis evaluaciones"}
                </BotonPersonalizado>
              </div>
            </form>

            {/* OTHER ACCESS */}

            <div className={styles.divider}>
              <span />

              <p>Otro tipo de acceso</p>

              <span />
            </div>

            <button
              type="button"
              className={styles.adminAccess}
              onClick={() =>
                navigate("/admin/login")
              }
              disabled={loading}
            >
              <span
                className={
                  styles.adminAccessContent
                }
              >
                <strong>
                  ¿Sos parte del equipo?
                </strong>

                <span>
                  Accedé al panel de gestión de
                  Join Solution.
                </span>
              </span>

              <span
                className={
                  styles.adminAccessAction
                }
              >
                Panel administrativo

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
                Tus datos de acceso son
                personales y confidenciales
              </p>
            </footer>
          </div>
        </section>
      </section>
    </main>
  );
}