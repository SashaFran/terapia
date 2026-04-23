import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../Sidebar/Sidebar.module.css";
import logo from "../../assets/IMAGES/JOIN SOLUTION.svg";

import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase.tsx";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const rol = localStorage.getItem("rol");
  const dni = localStorage.getItem("dni");

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
    { to: "/app/dni", label: "Tu Documentación" },
  ];

  const links = rol === "admin" ? linksAdmin : linksPaciente;

  return (
    <aside className={styles.sidebar}>
      <nav className={styles.menu} id="menu">

        {/* LOGO */}
        <div className={styles.logoBox}>
          <img src={logo} alt="Logo" />
        </div>

        {/* LINKS NORMALES (SIN BURBUJA) */}
        {links.map((link) => (
          <div key={link.to} className={styles.menuItem}>
            <div className={styles.menuText}>
              <Link
                to={link.to}
                className={`${styles.item} ${
                  pathname.startsWith(link.to) ? styles.active : ""
                }`}
              >
                {link.label}
              </Link>
            </div>
          </div>
        ))}

        {/* USER (ÚNICO CON SUBMENU) */}
        <div className={`${styles.menuItem} ${styles.highlight}`}>
          <div className={styles.menuText}>
            <span className={styles.userTrigger}>
              {localStorage.getItem("email") || "Usuario"}
            </span>
          </div>

          {/* BURBUJA */}
          <div className={styles.subMenu}>
            <div className={styles.iconBox}>
              
              <div className={styles.text}>
                <div className={styles.title}>
                  Cuenta
                </div>

                <div className={styles.subText}>
                  DNI cargado: {dni ? "✔ Sí" : "✖ No"}
                </div>
              </div>
            </div>

            <div className={styles.iconBox}>
              <button
                onClick={handleLogout}
                className={styles.logoutBtn}
              >
                Cerrar sesión
              </button>
            </div>

            <div className={styles.subMenuHolder}></div>
          </div>
        </div>

        {/* CONTENEDOR (necesario para animación tipo Stripe) */}
        <div id={styles.subMenuContainer}>
          <div id={styles.subMenuHolder}>
            <div id={styles.subMenuBottom}></div>
          </div>
        </div>

      </nav>
    </aside>
  );
}