import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../Sidebar/Sidebar.module.css";

import logo from "../../assets/images/JOIN SOLUTION.svg";
import puntos from "../../assets/Icons/dots-y(1).svg";  

import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase.tsx";
import BotonPersonalizado from "../Boton/Boton.tsx";
import { useEffect, useState } from "react";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const rol = localStorage.getItem("rol");
  const dni = localStorage.getItem("dni_public_id");

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  };

  const linksAdmin = [
    { to: "/admin/dashboard", label: "Dashboard" },
    { to: "/admin/pacientes", label: "Pacientes" },
    { to: "/admin/sesiones", label: "Sesiones" },
  ];

  const linksPaciente = [
    { to: "/app/dashboard", label: "Dashboard" },
    { to: "/app/tests", label: "Mis Tests" },
    { to: "/app/dni", label: "Mi Documentación" },
  ];

  const links = rol === "admin" ? linksAdmin : linksPaciente;

  const getTiempoRestante = (fechaLimite) => {
    const ahora = new Date();
    const fin = new Date(fechaLimite);

    const diff = fin - ahora; // en ms

    if (diff <= 0) return "Expirado";

    const minutosTotales = Math.floor(diff / 1000 / 60);
    const horas = Math.floor(minutosTotales / 60);
    const minutos = minutosTotales % 60;

    if (horas === 0) return `${minutos}m`;
if (horas < 24) return `${horas}h ${minutos}m`;
  };

  
  
  const [tiempo, setTiempo] = useState("");

  useEffect(() => {
    const fecha = "2026-04-23T00:00:00";

    const actualizar = () => {
      setTiempo(getTiempoRestante(fecha));
    };

    actualizar(); // inicial

    const interval = setInterval(actualizar, 60000);

    return () => clearInterval(interval);
  }, []);
    const paciente = JSON.parse(localStorage.getItem("paciente") || "null");
    const nombre = paciente?.nombre || "Usuario";

// ADMIN
const emailAdmin = localStorage.getItem("email");

// -------- NORMALIZACIÓN --------
let displayName = "Usuario";
let subText = "";
let iniciales = "?";

if (rol === "admin") {
  const base = emailAdmin?.split("@")[0] || "admin";

  displayName = base;
  subText = emailAdmin || "";
  iniciales = base.charAt(0).toUpperCase();
} else {
  const nombreCompleto = paciente?.nombre || "Paciente";

  const partes = nombreCompleto.split(" ");

  iniciales = partes.map(p => p[0]).join("").toUpperCase();
  displayName = nombreCompleto;
  subText = paciente?.dni || "";
}

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.navbar}>

        {/* IZQUIERDA */}
        <div className={styles.left}>
          <img src={logo} alt="Logo" />
        </div>

        {/* CENTRO */}
        <div className={styles.center}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.item} ${
                pathname.startsWith(link.to) ? styles.active : ""
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* DERECHA (USER) */}
        <div  className={`boton-secondary ${styles.right}`}>
          <div className={styles.userWrapper}>
            <div className={styles.userTrigger}>
              <div className={styles.avatar}>
                {iniciales}
              </div>

              <div className={styles.userInfo}>
                <span className={styles.name}>{displayName}</span>
                <span className={styles.sub}>{subText}</span>
              </div>
              <div>{" "}</div>
              {/* <span className={styles.arrow}><img src={puntos} alt="Más opciones" /></span> */}
          </div>

            {/* SUBMENU PRO */}
            <div className={`${styles.subMenu} ${styles.triple}`}>
  
            {/* 👤 PACIENTE */}
            {rol !== "admin" && (
                    <>
                      <div className={styles.topContainer}>
                        <div className={styles.box}>
                          <h3>Tiempo restante:</h3>
                          <div className={styles.subText}>{tiempo}</div>
                        </div>
                      </div>

                  <div className={styles.box}>
                    <h3>Tus archivos</h3>
                    <div className={styles.subText}>
                      DNI cargado: {dni !== "" ? "✔ Sí" : "✖ No"}
                    </div>
                  </div>

                  <div className={styles.box}>
                    <h3>Email de contacto</h3>
                    <div className={styles.subText}>
                      ejemplo@ejemplo.com
                    </div>
                  </div>
                </>
              )}

              {/* 🔐 COMÚN A TODOS */}
              <div className={styles.box}>

              <BotonPersonalizado
                variant="secondary"
                onClick={handleLogout}
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