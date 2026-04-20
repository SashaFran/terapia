import { useNavigate } from "react-router-dom";
import styles from "./Selector.module.css";
import BotonPersonalizado from "../../components/Boton/Boton";

export default function Selector() {
  const navigate = useNavigate();
  
    const paciente = localStorage.getItem("paciente");
    if (paciente) navigate("/app/dashboard");

  return (
    <div className={styles.selectorContainer}>
      <div className={styles.selectorBox}>
        <h1>Join Solution</h1>
        <p>¿Cómo deseas ingresar?</p>

        <div className={styles.buttonsContainer}>
          <BotonPersonalizado
              variant="primary"
              onClick={() => navigate("/login")}
              disabled= {false}
            >
              Paciente
            </BotonPersonalizado>
            <BotonPersonalizado
              variant="primary"
              onClick={() => navigate("/admin/login")}
              disabled= {false}
            >
              Administrador
            </BotonPersonalizado>
        </div>
      </div>
    </div>
  );
}