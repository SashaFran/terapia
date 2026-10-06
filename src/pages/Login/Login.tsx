import { useState } from "react";
import { useNavigate } from "react-router-dom";

import BotonPersonalizado from "../../components/Boton/Boton";

import { useAuth } from "../../context/AuthContext";

import Logo from "../../assets/images/logo.svg";

import {
  recuperarAccesoAdmin,
} from "../../firebase/admin";

import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] =
    useState("");

  const [password, setPassword] =
    useState("");

  const [error, setError] =
    useState("");

  const [info, setInfo] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [recovering, setRecovering] =
    useState(false);

  const navigate = useNavigate();

  const { login } = useAuth();

  /* =======================================================
     LOGIN
  ======================================================= */

  const handleLogin = async () => {
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

      localStorage.removeItem(
        "paciente",
      );

      localStorage.setItem(
        "rol",
        "admin",
      );

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

  const handleForgotPassword =
    async () => {
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

        /*
         * El mensaje es intencionalmente neutro.
         *
         * No confirmamos si el email existe
         * ni si corresponde a un administrador.
         */

        setInfo(
          "Si existe una cuenta administrativa asociada a ese email, recibirás un correo con las instrucciones para crear una nueva contraseña.",
        );
      } catch (error) {
        /*
         * Incluso ante determinados errores evitamos
         * revelar información sobre las cuentas.
         */

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
      <div
        className={styles.backgroundGlow}
        aria-hidden="true"
      />

      <section
        className={styles.loginCard}
      >
        {/* ===============================================
            BRAND
        =============================================== */}

        <header className={styles.header}>
          <div
            className={styles.brandMark}
          >
            <img
              src={Logo}
              alt="Join Solution"
            />
          </div>

          <div
            className={styles.brandCopy}
          >
            <p
              className={styles.eyebrow}
            >
              Join Solution
            </p>

            <h1>
              Acceso administrativo
            </h1>

            <p
              className={styles.subtitle}
            >
              Ingresá tus credenciales
              para acceder al panel de
              gestión.
            </p>
          </div>
        </header>

        {/* ===============================================
            FORM
        =============================================== */}

        <div className={styles.form}>
          {/* EMAIL */}

          <div
            className={styles.field}
          >
            <label
              htmlFor="admin-email"
            >
              Email
            </label>

            <input
              id="admin-email"
              type="email"
              autoComplete="email"
              placeholder="nombre@joinsolution.com"
              value={email}
              onChange={(e) => {
                setEmail(
                  e.target.value,
                );

                if (error) {
                  setError("");
                }

                if (info) {
                  setInfo("");
                }
              }}
              onKeyDown={
                handleKeyDown
              }
              disabled={
                loading ||
                recovering
              }
            />
          </div>

          {/* PASSWORD */}

          <div
            className={styles.field}
          >
            <div
              className={
                styles.passwordHeader
              }
            >
              <label
                htmlFor="admin-password"
              >
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
                  loading ||
                  recovering
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
                setPassword(
                  e.target.value,
                );

                if (error) {
                  setError("");
                }

                if (info) {
                  setInfo("");
                }
              }}
              onKeyDown={
                handleKeyDown
              }
              disabled={
                loading ||
                recovering
              }
            />
          </div>

          {/* =============================================
              MENSAJES
          ============================================= */}

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

          {/* =============================================
              LOGIN
          ============================================= */}

          <div
            className={
              styles.primaryAction
            }
          >
            <BotonPersonalizado
              variant="primary"
              onClick={
                handleLogin
              }
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

        {/* ===============================================
            PATIENT ACCESS
        =============================================== */}

        <div
          className={styles.divider}
        >
          <span />

          <p>
            Otro tipo de acceso
          </p>

          <span />
        </div>

        <div
          className={
            styles.patientAccess
          }
        >
            <strong>
              ¿Sos paciente?
            </strong>

            <p>
              Accedé a tus
              evaluaciones desde el
              portal de pacientes.
            </p>

          <button
            type="button"
            className={
              styles.patientButton
            }
            onClick={() =>
              navigate("/login")
            }
            disabled={
              loading ||
              recovering
            }
          >
            Ingresar como paciente

            <span aria-hidden="true">
              →
            </span>
          </button>
        </div>

        {/* ===============================================
            FOOTER
        =============================================== */}

        <footer
          className={styles.footer}
        >
          <span
            className={
              styles.securityDot
            }
          />

          <p>
            Acceso exclusivo para
            personal autorizado
          </p>
        </footer>
      </section>
    </main>
  );
}