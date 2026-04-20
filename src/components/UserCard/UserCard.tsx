import styles from "./UserCard.module.css";
import { useAuth } from "../../context/AuthContext";

export default function UserCard() {
  const { user } = useAuth();

  const rol = localStorage.getItem("rol");
  const paciente = JSON.parse(localStorage.getItem("paciente") || "null");

  let nombre = "Usuario";

  if (rol === "paciente" && paciente?.nombre) {
    nombre = paciente.nombre;
  } else if (rol === "admin" && user?.email) {
    nombre = user.email;
  }

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={styles.info}>
        <h3 className={styles.name}>
          Hola, {nombre}
        </h3>
      </div>
    </div>
  );
}