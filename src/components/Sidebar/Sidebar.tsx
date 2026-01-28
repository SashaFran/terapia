import { Link, useLocation } from "react-router-dom";
import styles from "./sidebar.module.css";
import logo from "../../assets/IMAGES/JOIN SOLUTION.svg";
import UserCard from "../UserCard/UserCard";
import BotonPersonalizado from "../Boton/Boton.tsx";

import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase.tsx";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";


export default function Sidebar() {
    const { pathname } = useLocation();

    const navigate = useNavigate();
    const { user } = useAuth();

    const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
    };
    
    return (
        <aside className={styles.sidebar}>
            <div className={`global-container ${styles.container}`}>
                <div className={styles.logoBox}>
                    <img src={logo} alt="Logo" />
                </div>
                <UserCard />
                <nav className={styles.nav}>
                    <Link
                        to="/"
                        className={`${styles.item} ${pathname === "/" ? styles.active : ""}`}
                    >
                        <span>Dashboard</span>
                    </Link>

                    <Link
                        to="/pacientes"
                        className={`${styles.item} ${pathname === "/pacientes" ? styles.active : ""}`}
                    >
                        <span>Pacientes</span>
                    </Link>

                    <Link
                        to="/sesiones"
                        className={`${styles.item} ${pathname === "/sesiones" ? styles.active : ""}`}
                    >
                        <span>Sesiones</span>
                    </Link>
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
