import { useState } from "react";
import { useNavigate } from "react-router-dom";
import BotonPersonalizado from "../../components/Boton/Boton";
import { useAuth } from "../../context/AuthContext";
import styles from "./Login.module.css";
import { sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../../firebase/firebase";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Completá email y contraseña");
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      localStorage.removeItem("paciente");
      localStorage.setItem("rol", "admin");
      navigate("/admin/dashboard");
    } catch {
      setError("Credenciales incorrectas");
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) {
      setError("Ingresá tu email para restablecer la contraseña.");
      return;
    }
    try {
      setLoading(true);
      await sendPasswordResetEmail(auth, email);
      alert("Te enviamos un correo con un enlace para restablecer tu contraseña.");
    } catch {
      setError("No se pudo enviar el correo de restablecimiento.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className={styles.loading}>Cargando pantalla...</div>;
  }

  return (
    <div className="loginContainer">
      <div className="loginBox">
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

          <div className="nav">
            <BotonPersonalizado
              variant="primary"
              onClick={handleLogin}
              disabled={!email || !password}
            >
              Ingresar
            </BotonPersonalizado>
            <BotonPersonalizado
              variant="secondary"
              onClick={() => navigate("/login")}
              disabled={false}
            >
              Ingresar como paciente
            </BotonPersonalizado>
          </div>
          <div className="nav">
            <BotonPersonalizado
              variant="secondary"
              onClick={handleResetPassword}
              disabled={!email}
            >
              Restablecer contraseña
            </BotonPersonalizado>
          </div>
        </div>
      </div>
    </div>
  );
}