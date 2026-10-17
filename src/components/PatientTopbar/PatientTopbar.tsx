import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import KeyboardArrowDownRounded from "@mui/icons-material/KeyboardArrowDownRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import logo from "../../assets/images/logo.svg";
import logoNombre from "../../assets/Icons/JOIN SOLUTION -  Nombre.svg";
import logoNombreDark from "../../assets/Icons/JOIN SOLUTION -  Nombre (para darkmode).svg";
import { logoutPatient } from "../../utils/patientAccess";
import styles from "./PatientTopbar.module.css";

type PatientProfile = {
  nombre?: string;
  dni?: string | number;
  email?: string;
  fechaFinAcceso?: unknown;
  esPacienteMaestro?: boolean;
};

const obtenerFecha = (value: unknown): Date | null => {
  if (!value) return null;

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof value.toDate === "function"
  ) {
    return value.toDate();
  }

  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof value.seconds === "number"
  ) {
    return new Date(value.seconds * 1000);
  }

  const date = new Date(value as string | number);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatearTiempo = (fechaFin: unknown, ahora: number) => {
  const fecha = obtenerFecha(fechaFin);
  if (!fecha) return "-- hs -- min";

  const minutos = Math.max(
    0,
    Math.ceil((fecha.getTime() - ahora) / (1000 * 60)),
  );

  return `${String(Math.floor(minutos / 60)).padStart(2, "0")} hs ${String(
    minutos % 60,
  ).padStart(2, "0")} min`;
};

export default function PatientTopbar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [ahora, setAhora] = useState(() => Date.now());
  const ref = useRef<HTMLDivElement>(null);
  const [patient, setPatient] = useState<PatientProfile>(() => {
    try {
      return JSON.parse(localStorage.getItem("paciente") || "{}");
    } catch {
      return {};
    }
  });
  useEffect(() => {
    try {
      setPatient(JSON.parse(localStorage.getItem("paciente") || "{}"));
    } catch {
      setPatient({});
    }
    setOpen(false);
  }, [pathname]);
  useEffect(() => {
    const interval = window.setInterval(() => setAhora(Date.now()), 60_000);
    return () => window.clearInterval(interval);
  }, []);
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (!ref.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, []);
  const name = patient.nombre || "Paciente";
  const initials =
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0].toUpperCase())
      .join("") || "P";
  const title = pathname.startsWith("/app/test/")
    ? "Evaluación"
    : pathname.startsWith("/app/tests")
      ? "Mis Tests"
      : pathname.includes("dni")
        ? "Mi Documentación"
        : "Dashboard";
  const dashboard = pathname === "/app/dashboard";
  const handleLogout = async () => {
    if (
      !window.confirm(
        "Si cierra sesión, su cuenta quedará inhabilitada y no podrá volver a ingresar ni completar las evaluaciones pendientes. ¿Está seguro?",
      )
    )
      return;
    try {
      await logoutPatient();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("No se pudo confirmar el cierre de sesión:", error);
      window.alert(
        "No pudimos cerrar la sesión. Comprobá tu conexión e intentá nuevamente.",
      );
    }
  };
  return (
    <header
      className={`${styles.topbar} ${dashboard ? styles.hero : styles.dark}`}
    >
      <div className={styles.brand}>
        <img className={styles.brandSymbol} src={logo} alt="" />
        <img
          className={styles.brandText}
          src={dashboard ? logoNombre : logoNombreDark}
          alt="JOIN SOLUTION"
        />
        <span className={dashboard ? styles.brandTextHero : styles.brandTextDark}>
          {title}
        </span>
      </div>
      <div className={styles.profileWrap} ref={ref}>
        <button
          type="button"
          className={styles.profile}
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className={styles.avatar}>{initials}</span>
          <span className={styles.identity}>
            <strong>{name}</strong>
            <small>Paciente</small>
          </span>
          <KeyboardArrowDownRounded fontSize="small" />
        </button>
        {open && (
          <div className={styles.menu} role="menu">
            <div className={styles.menuIdentity}>
              <span className={styles.menuAvatar}>{initials}</span>
              <div>
                <strong>{name}</strong>
                <span>{patient.email || "Paciente"}</span>
              </div>
            </div>
            <div className={styles.menuDetails}>
              <span>{patient.dni ? `DNI ${patient.dni}` : "DNI no informado"}</span>
              <span>
                Tiempo restante: {formatearTiempo(patient.fechaFinAcceso, ahora)}
              </span>
            </div>
            <button
              type="button"
              className={styles.logoutButton}
              role="menuitem"
              onClick={() => void handleLogout()}
            >
              <LogoutRounded fontSize="small" /> Cerrar sesión
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
