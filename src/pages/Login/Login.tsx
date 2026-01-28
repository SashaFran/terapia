import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../components/Boton/Boton";
import { useAuth } from "../../context/AuthContext";
import styles from "./Login.module.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { login } = useAuth(); // 👈 CLAVE

  const handleLogin = async () => {
    console.log("CLICK EN LOGIN");

    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }

    try {
      await login(email, password); // 👈 PASA POR EL CONTEXTO
      console.log("LOGIN OK");
      navigate("/");
    } catch (err) {
      console.error(err);
      setError("Credenciales incorrectas");
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <h2>Ingreso al sistema</h2>
        <div className={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="error">{error}</p>}

          <BotonPersonalizado
            variant="primary"
            onClick={handleLogin}
            disabled={!email || !password}
          >
            Ingresar
          </BotonPersonalizado>
        </div>
      </div>
    </div>
  );
}
