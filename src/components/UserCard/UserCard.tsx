import styles from "./UserCard.module.css";

import { useAuth } from "../../context/AuthContext";

export default function UserCard() {

  const { user } = useAuth();

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={styles.info}>
        <h3 className={styles.name}>{user?.email ? `Hola, ${user.email}` : "Usuario"}</h3>
      </div>
    </div>
  );
}
