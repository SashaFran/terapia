import { Link, useLocation, useNavigate } from "react-router-dom";
import styles from "../Sidebar/Sidebar.module.css";
import logo from "../../assets/IMAGES/JOIN SOLUTION.svg";
import UserCard from "../UserCard/UserCard";
import BotonPersonalizado from "../Boton/Boton.tsx";

import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase.tsx";

export default function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const rol = localStorage.getItem("rol");

  const handleLogout = async () => {
    await signOut(auth);
    localStorage.clear();
    navigate("/login");
  };

  // 🔥 LINKS SEGÚN ROL
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
      <div className={`global-container ${styles.container}`}>
        <div className={styles.logoBox}>
          <img src={logo} alt="Logo" />
        </div>

        <UserCard />

        <nav className={styles.nav}>
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className={`${styles.item} ${
                pathname.startsWith(link.to) ? styles.active : ""
              }`}
            >
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      <div>
        <BotonPersonalizado
          variant="secondary"
          onClick={handleLogout}
          disabled={false}
        >
          Cerrar sesión
        </BotonPersonalizado>
      </div>
    </aside>
  );
}