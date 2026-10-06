import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { doc, onSnapshot } from "firebase/firestore";
import { signOut } from "firebase/auth";

import Tooltip from "@mui/material/Tooltip";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";

import styles from "./Sidebar.module.css";

import { auth, db } from "../../firebase/firebase";
import { logoutPatient } from "../../utils/patientAccess";

import flecha from "../../assets/Icons/angulo-pequeno-hacia-abajo.svg";
import logo from "../../assets/images/logo.png";

import BotonPersonalizado from "../Boton/Boton";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const rol = localStorage.getItem("rol");
  const pacienteId = localStorage.getItem("pacienteId");

  const [tiempo, setTiempo] = useState("Cargando...");
  const [pacienteActual, setPacienteActual] = useState<any>(null);

  /* ======================================================
     LOGOUT
     ====================================================== */

  const handleLogout = async () => {
    if (rol === "paciente") {
      if (
        !window.confirm(
          "Si cierra sesión, su cuenta quedará inhabilitada y no podrá volver a ingresar ni completar las evaluaciones pendientes. ¿Desea cerrar sesión?",
        )
      ) {
        return;
      }

      try {
        await logoutPatient();
      } catch {
        /*
         * Server expiry remains the fallback.
         */
      }

      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    }

    localStorage.clear();

    navigate("/admin/login", {
      replace: true,
    });
  };

  /* ======================================================
     LINKS
     ====================================================== */

  const linksAdmin = [
    {
      to: "/admin/dashboard",
      label: "Dashboard",
      ayuda: "Consultar el resumen de actividad y evaluaciones.",
      icon: <DashboardOutlined />,
    },
    {
      to: "/admin/pacientes",
      label: "Pacientes",
      ayuda:
        "Registrar pacientes, asignar tests y consultar sus informes.",
      icon: <PeopleOutline />,
    },
    {
      to: "/admin/sesiones",
      label: "Sesiones",
      ayuda: "Consultar y gestionar las sesiones de evaluación.",
      icon: <AssignmentOutlined />,
    },
  ];

  const linksPaciente = [
    {
      to: "/app/dashboard",
      label: "Dashboard",
      ayuda: "Consultar el estado de su acceso y los pasos pendientes.",
    },
    {
      to: "/app/tests",
      label: "Mis Tests",
      ayuda: "Ver sus evaluaciones asignadas e iniciar las pendientes.",
    },
    {
      to: "/app/dni",
      label: "Mi Documentación",
      ayuda: "Cargar su DNI para habilitar las evaluaciones.",
    },
  ];

  /* ======================================================
     PACIENTE — TIEMPO RESTANTE
     ====================================================== */

  const getTiempoRestante = (fechaLimite: Date) => {
    const ahora = new Date();

    const diff = fechaLimite.getTime() - ahora.getTime();

    if (diff <= 0) {
      return "Acceso finalizado";
    }

    const minutosTotales = Math.floor(diff / 1000 / 60);
    const horasTotales = Math.floor(minutosTotales / 60);

    const dias = Math.floor(horasTotales / 24);
    const horas = horasTotales % 24;
    const minutos = minutosTotales % 60;

    if (dias > 0) {
      return `${dias}d ${horas}h`;
    }

    if (horas > 0) {
      return `${horas}h ${minutos}m`;
    }

    return `${minutos}m`;
  };

  useEffect(() => {
    setPacienteActual(null);

    if (rol === "admin") {
      return;
    }

    const pacienteData = localStorage.getItem("paciente");

    if (!pacienteData) {
      setTiempo("No disponible");
      return;
    }

    try {
      JSON.parse(pacienteData);
    } catch {
      setTiempo("No disponible");
      return;
    }

    const userId = pacienteId;

    if (!userId) {
      setTiempo("No disponible");
      return;
    }

    const docRef = doc(db, "pacientes", userId);

    let interval: ReturnType<typeof setInterval> | undefined;

    const unsubscribe = onSnapshot(
      docRef,

      (docSnap) => {
        if (!docSnap.exists()) {
          setTiempo("No disponible");
          return;
        }

        const data = docSnap.data();

        setPacienteActual({
          ...data,
          id: docSnap.id,
        });

        const fechaFin = data.fechaFinAcceso;

        if (!fechaFin) {
          setTiempo("Sin límite");
          return;
        }

        const fechaParaCalculo =
          typeof fechaFin.toDate === "function"
            ? fechaFin.toDate()
            : fechaFin.seconds
              ? new Date(fechaFin.seconds * 1000)
              : new Date(fechaFin);

        const updateContador = () => {
          setTiempo(getTiempoRestante(fechaParaCalculo));
        };

        updateContador();

        if (interval) {
          clearInterval(interval);
        }

        interval = setInterval(updateContador, 60000);
      },

      (error) => {
        console.error("Error al obtener paciente:", error);
        setTiempo("No disponible");
      },
    );

    return () => {
      unsubscribe();

      if (interval) {
        clearInterval(interval);
      }
    };
  }, [rol, pacienteId]);

  /* ======================================================
     PACIENTE — DATOS
     ====================================================== */

  const nombreCompleto = pacienteActual?.nombre || "Paciente";

  const partes = nombreCompleto
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const iniciales =
    partes
      .slice(0, 2)
      .map((parte: string) => parte.charAt(0))
      .join("")
      .toUpperCase() || "P";

  const displayName = nombreCompleto;

  const subText = pacienteActual?.dni
    ? `DNI ${pacienteActual.dni}`
    : "Paciente";

  const dniCargado =
    pacienteActual?.id === pacienteId &&
    typeof pacienteActual?.archivodni === "string" &&
    pacienteActual.archivodni.trim().length > 0;

  /* ======================================================
     ADMIN
     ====================================================== */

  if (rol === "admin") {
    return (
      <aside
        className={styles.adminRail}
        aria-label="Navegación principal"
      >
        <Link
          to="/admin/dashboard"
          className={styles.adminLogo}
          aria-label="Join Solution"
        >
          <img src={logo} alt="" />
        </Link>

        <nav
          className={styles.adminNav}
          aria-label="Secciones administrativas"
        >
          {linksAdmin.map((link, index) => {
            const active =
              pathname.startsWith(link.to) ||
              (index === 1 &&
                (pathname.startsWith("/admin/paciente/") ||
                  pathname.includes("nuevo-paciente")));

            return (
              <Tooltip
                key={link.to}
                title={link.label}
                placement="right"
                enterDelay={400}
                arrow
              >
                <Link
                  to={link.to}
                  className={`${styles.adminNavLink} ${
                    active ? styles.adminNavActive : ""
                  }`}
                  aria-label={link.label}
                  aria-current={active ? "page" : undefined}
                >
                  {link.icon}
                </Link>
              </Tooltip>
            );
          })}
        </nav>
      </aside>
    );
  }

  /* ======================================================
     PACIENTE
     ====================================================== */

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navbar}>
        <div className={styles.center}>
          {linksPaciente.map((link) => (
            <Tooltip
              key={link.to}
              title={link.ayuda}
              describeChild
              arrow
              enterTouchDelay={300}
            >
              <Link
                to={link.to}
                className={`${styles.item} ${
                  pathname.startsWith(link.to)
                    ? styles.active
                    : ""
                }`}
              >
                {link.label}
              </Link>
            </Tooltip>
          ))}
        </div>

        <div className={styles.right}>
          <div className={styles.userWrapper}>
            <div className={styles.userTrigger}>
              <div className={styles.avatar}>
                {iniciales}
              </div>

              <div className={styles.userInfo}>
                <span className={styles.name}>
                  {displayName}
                </span>

                <img
                  src={flecha}
                  alt=""
                  className={styles.arrow}
                />
              </div>
            </div>

            <div className={styles.subMenu}>
              <div className={styles.menuHeader}>
                <div className={styles.menuAvatar}>
                  {iniciales}
                </div>

                <div className={styles.menuIdentity}>
                  <strong>{displayName}</strong>
                  <span>{subText}</span>
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.menuContent}>
                <div className={styles.infoRow}>
                  <div>
                    <span className={styles.infoLabel}>
                      Acceso disponible
                    </span>

                    <strong className={styles.timeValue}>
                      {tiempo}
                    </strong>
                  </div>

                  <span className={styles.statusDot} />
                </div>

                <div className={styles.infoRow}>
                  <div>
                    <span className={styles.infoLabel}>
                      Documentación
                    </span>

                    <strong
                      className={
                        dniCargado
                          ? styles.successValue
                          : styles.pendingValue
                      }
                    >
                      {dniCargado
                        ? "DNI cargado"
                        : "DNI pendiente"}
                    </strong>
                  </div>

                  <span
                    className={
                      dniCargado
                        ? styles.checkIcon
                        : styles.pendingIcon
                    }
                  >
                    {dniCargado ? "✓" : "!"}
                  </span>
                </div>
              </div>

              <div className={styles.logoutContainer}>
                <BotonPersonalizado
                  variant="secondary"
                  onClick={handleLogout}
                  tooltip="Cerrar su sesión en este dispositivo."
                  disabled={false}
                >
                  Cerrar sesión
                </BotonPersonalizado>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </aside>
  );
}