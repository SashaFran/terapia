import { useEffect, useState } from "react";
import { db } from "../../../firebase/firebase";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../../components/Boton/Boton";
import styles from "./LoginPaciente.module.css";
import {
  isPacienteAuthenticated,
  setPacienteSession,
} from "../../../utils/pacienteSession";

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

export default function LoginPaciente() {
  const [dni, setDni] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();

  useEffect(() => {
    if (isPacienteAuthenticated()) {
      navigate("/app/dashboard", {
        replace: true,
      });
    }
  }, [navigate]);

  const handleLogin = async (e: any) => {
    e.preventDefault();

    setError("");

    const dniLimpio = dni.replace(/\D/g, "");

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
        setError("Paciente no encontrado");
        return;
      }

      const docPaciente = snap.docs[0];
      const pacienteData = docPaciente.data();

      /*
       * Validar contraseña
       */
      if (pacienteData.password !== password) {
        setError("Contraseña incorrecta");
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
          } catch (error) {
            console.error(
              "No se pudo actualizar el estado del paciente:",
              error,
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
        snapAsignaciones.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

      /*
       * Comprobar si terminó todo el flujo
       */
      const total = asignaciones.length;

      const completados =
        asignaciones.filter(
          (a: any) =>
            a.estado === "completado",
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
          } catch (error) {
            console.error(
              "No se pudo actualizar el estado del paciente:",
              error,
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
    } catch (error) {
      console.error(
        "Error al intentar ingresar:",
        error,
      );

      setError(
        "Error al intentar ingresar",
      );
    }
  };

  return (
    <div className="loginContainer">
      <div className="loginBox">
        <h2>Ingreso Paciente</h2>

        <div className={styles.form}>
          <input
            placeholder="DNI"
            value={dni}
            onChange={(e) =>
              setDni(e.target.value)
            }
          />

          <input
            type="password"
            placeholder="Contraseña (últimos 6 dígitos del DNI)"
            value={password}
            onChange={(e) =>
              setPassword(e.target.value)
            }
          />

          {error && (
            <p className="error">
              {error}
            </p>
          )}

          <div className="nav">
            <BotonPersonalizado
              variant="primary"
              onClick={handleLogin}
              disabled={!dni || !password}
            >
              Ingresar
            </BotonPersonalizado>

            <BotonPersonalizado
              variant="secondary"
              onClick={() =>
                navigate("/admin/login")
              }
              disabled={false}
            >
              Ingresar como administrador
            </BotonPersonalizado>
          </div>
        </div>
      </div>
    </div>
  );
}