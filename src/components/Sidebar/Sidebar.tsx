import { Link, useLocation } from "react-router-dom";
import Tooltip from "@mui/material/Tooltip";
import DashboardOutlined from "@mui/icons-material/DashboardOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import BadgeOutlined from "@mui/icons-material/BadgeOutlined";
import styles from "./Sidebar.module.css";
import logo from "../../assets/images/logo.png";

export default function Sidebar() {
  const { pathname } = useLocation();
  const esPaciente = pathname.startsWith("/app/");
  const links = esPaciente ? [
    { to: "/app/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { to: "/app/tests", label: "Mis Tests", icon: <AssignmentOutlined /> },
    { to: "/app/dni", label: "Mi Documentación", icon: <BadgeOutlined /> },
  ] : [
    { to: "/admin/dashboard", label: "Dashboard", icon: <DashboardOutlined /> },
    { to: "/admin/pacientes", label: "Pacientes", icon: <PeopleOutline /> },
    { to: "/admin/sesiones", label: "Sesiones", icon: <AssignmentOutlined /> },
  ];
  return (
    <aside className={styles.adminRail} aria-label={esPaciente ? "Navegación del paciente" : "Navegación principal"}>
      <Link to={esPaciente ? "/app/dashboard" : "/admin/dashboard"} className={styles.adminLogo} aria-label="Join Solution">
        <img src={logo} alt="" />
      </Link>
      <nav className={styles.adminNav} aria-label="Secciones">
        {links.map((link) => {
          const active = pathname.startsWith(link.to) ||
            (!esPaciente && link.to === "/admin/pacientes" && (pathname.startsWith("/admin/paciente/") || pathname.includes("nuevo-paciente"))) ||
            (esPaciente && link.to === "/app/tests" && pathname.startsWith("/app/test/"));
          return (
            <Tooltip key={link.to} title={link.label} placement="right" enterDelay={400} arrow>
              <Link to={link.to} className={`${styles.adminNavLink} ${active ? styles.adminNavActive : ""}`} aria-label={link.label} aria-current={active ? "page" : undefined}>
                {link.icon}
              </Link>
            </Tooltip>
          );
        })}
      </nav>
    </aside>
  );
}
