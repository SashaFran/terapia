import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";



import { loginPatient, hasPatientAccess } from "../../../utils/patientAccess";
import { mensajeErrorPaciente } from "../../../firebase/pacientes";

import BotonPersonalizado from "../../../components/Boton/Boton";

import styles from "./LoginPaciente.module.css";



import Logo from "../../../assets/images/logo.svg"

/* =========================================================
   HELPERS
========================================================= */

export default function LoginPaciente() {
  const [accepted, setAccepted] = useState(false);
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    const dniLimpio = dni.replace(/\D/g, "");

    if (!dniLimpio || !password) {
      setError(
        "Completá tu DNI y contraseña.",
      );
      return;
    }

    setLoading(true);

    try {
      if (!accepted) { setError("Debe leer y aceptar las condiciones de acceso antes de ingresar."); return; }
      await loginPatient(dniLimpio, password);
      navigate("/app/dashboard");
    } catch (loginError) {
      const code = (loginError as { code?: string }).code;
      setError(code?.startsWith("auth/") ? "No se pudo ingresar. Verifique su DNI y contraseña o contacte a administración." : mensajeErrorPaciente(loginError));
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
        className={styles.backgroundGlow}
        aria-hidden="true"
      />

      <section className={styles.loginCard}>
        {/* ===============================================
            HEADER
        =============================================== */}

        <header className={styles.header}>
          <div
            className={styles.brandMark}
            aria-hidden="true"
          >
            <img src={Logo} alt="logo"/>
          </div>

          <div className={styles.brandCopy}>
            <p className={styles.eyebrow}>
              Join Solution
            </p>

            <h1>Acceso a evaluaciones</h1>

            <p className={styles.subtitle}>
              Ingresá con los datos que recibiste
              para acceder a tus evaluaciones.
            </p>
          </div>
        </header>

        {/* ===============================================
            FORM
        =============================================== */}

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

            <span className={styles.fieldHelp}>
              Ingresalo sin puntos ni espacios.
            </span>
          </div>

          {/* CONTRASEÑA */}

          <div className={styles.field}>
            <label htmlFor="paciente-password">
              Contraseña
            </label>

            <input
              id="paciente-password"
              type="password"
              autoComplete="current-password"
              placeholder="Ingresá tu contraseña"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              disabled={loading}
            />

            <span className={styles.fieldHelp}>
              Usá la contraseña incluida en tu
              correo de acceso.
            </span>
          </div>

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

          {/* BOTÓN PRINCIPAL */}

          <div className={styles.primaryAction}>
            <section className="access-policy" aria-label="Condiciones de acceso">
            <strong>Acceso de una sola sesión</strong>
            <p>Al cerrar sesión, cerrar esta pestaña o ventana, o recargar la página, su cuenta quedará inhabilitada. No podrá volver a ingresar ni completar las evaluaciones pendientes.</p>
            <p>Antes de ingresar, prepare la imagen frontal de su DNI (JPG, JPEG o PNG) y una computadora con cámara. Reserve hasta 30 minutos por evaluación.</p>
            <label><input type="checkbox" checked={accepted} onChange={e => setAccepted(e.target.checked)} /> He leído las condiciones y estoy listo/a para completar las evaluaciones.</label>
          </section>
          <BotonPersonalizado
              variant="primary"
              type="submit"
              disabled={
                loading ||
                !accepted || !dni.trim() ||
                !password
              }
            >
              {loading
                ? "Ingresando..."
                : "Ingresar a mis evaluaciones"}
            </BotonPersonalizado>
          </div>
        </form>

        {/* ===============================================
            DIVISOR
        =============================================== */}

        <div className={styles.divider}>
          <span />

          <p>Otro tipo de acceso</p>

          <span />
        </div>

        {/* ===============================================
            ADMIN
        =============================================== */}

        <div className={styles.adminAccess}>
          <div>
            <strong>
              ¿Sos parte del equipo?
            </strong>

            <p>
              Accedé al panel de gestión de
              Join Solution.
            </p>
          </div>

          <button
            type="button"
            className={styles.adminButton}
            onClick={() =>
              navigate("/admin/login")
            }
            disabled={loading}
          >
            Acceso administrativo

            <span aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* ===============================================
            FOOTER
        =============================================== */}

        <footer className={styles.footer}>
          <span
            className={styles.securityDot}
          />

          <p>
            Tus datos de acceso son personales
            y confidenciales
          </p>
        </footer>
      </section>
    </main>
  );
}