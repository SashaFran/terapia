import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";

import { db } from "../../../firebase/firebase";

import BotonPersonalizado from "../../../components/Boton/Boton";

import styles from "./LoginPaciente.module.css";

import {
  isPacienteAuthenticated,
  setPacienteSession,
} from "../../../utils/pacienteSession";

import Logo from "../../../assets/images/logo.svg"

/* =========================================================
   HELPERS
========================================================= */

function convertirFecha(fecha: any): Date | null {
  if (!fecha) return null;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const date = new Date(fecha);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

function formatearFecha(fecha: Date): string {
  return fecha.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/* =========================================================
   COMPONENT
========================================================= */

export default function LoginPaciente() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /* =======================================================
     SESIÓN EXISTENTE
  ======================================================= */

  useEffect(() => {
    if (isPacienteAuthenticated()) {
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
      /*
       * Buscar paciente por DNI
       */

      const q = query(
        collection(db, "pacientes"),
        where("dni", "==", dniLimpio),
      );

      const snap = await getDocs(q);

      if (snap.empty) {
        setError(
          "No encontramos un acceso asociado a los datos ingresados.",
        );
        return;
      }

      const docPaciente = snap.docs[0];
      const pacienteData = docPaciente.data();

      /*
       * Validar contraseña
       */

      if (pacienteData.password !== password) {
        setError(
          "El DNI o la contraseña ingresados no son correctos.",
        );
        return;
      }

      /*
       * Obtener ventana real de acceso
       */

      const ahora = new Date();

      const inicio = convertirFecha(
        pacienteData.fechaInicioAcceso,
      );

      const fin = convertirFecha(
        pacienteData.fechaFinAcceso,
      );

      /*
       * Todavía no comenzó el acceso
       */

      if (inicio && ahora < inicio) {
        setError(
          `Tu acceso estará habilitado a partir del ${formatearFecha(
            inicio,
          )}.`,
        );

        return;
      }

      /*
       * El período ya terminó
       */

      if (fin && ahora >= fin) {
        setError(
          "El período de acceso a tus evaluaciones ha finalizado.",
        );

        if (pacienteData.activo !== false) {
          try {
            await updateDoc(
              doc(
                db,
                "pacientes",
                docPaciente.id,
              ),
              {
                activo: false,
              },
            );
          } catch (updateError) {
            console.error(
              "No se pudo actualizar el estado del paciente:",
              updateError,
            );
          }
        }

        return;
      }

      /*
       * Paciente desactivado manualmente
       */

      if (pacienteData.activo === false) {
        setError(
          "Tu acceso se encuentra deshabilitado.",
        );

        return;
      }

      /*
       * Obtener tests asignados
       */

      const qAsignaciones = query(
        collection(db, "asignaciones"),
        where(
          "pacienteId",
          "==",
          docPaciente.id,
        ),
      );

      const snapAsignaciones =
        await getDocs(qAsignaciones);

      const asignaciones =
        snapAsignaciones.docs.map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }));

      /*
       * Comprobar si terminó todo el flujo
       */

      const total = asignaciones.length;

      const completados =
        asignaciones.filter(
          (asignacion: any) =>
            asignacion.estado === "completado",
        ).length;

      const testsCompletos =
        total > 0 &&
        total === completados;

      const dniCargado =
        !!pacienteData.archivodni;

      const flujoTerminado =
        testsCompletos &&
        dniCargado;

      /*
       * Si ya terminó evaluaciones + DNI,
       * no puede volver a entrar.
       */

      if (flujoTerminado) {
        setError(
          "Las evaluaciones asignadas ya fueron completadas.",
        );

        if (pacienteData.activo !== false) {
          try {
            await updateDoc(
              doc(
                db,
                "pacientes",
                docPaciente.id,
              ),
              {
                activo: false,
              },
            );
          } catch (updateError) {
            console.error(
              "No se pudo actualizar el estado del paciente:",
              updateError,
            );
          }
        }

        return;
      }

      /*
       * Login correcto
       */

      const pacienteLogueado = {
        id: docPaciente.id,
        ...pacienteData,
        flujoTerminado,
      };

      setPacienteSession(
        pacienteLogueado,
        docPaciente.id,
      );

      navigate("/app/dashboard");
    } catch (loginError) {
      console.error(
        "Error al intentar ingresar:",
        loginError,
      );

      setError(
        "No pudimos iniciar tu sesión. Intentá nuevamente.",
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
            <BotonPersonalizado
              variant="primary"
              type="submit"
              disabled={
                loading ||
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