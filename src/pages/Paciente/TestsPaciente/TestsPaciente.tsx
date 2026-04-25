import { useEffect, useState } from "react";
import { db } from "../../../firebase/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import styles from "./TestsPaciente.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";
import { useNavigate } from "react-router-dom";

interface Test {
  id: string;
  testId?: string;
  estado: string;
}

export default function TestsPaciente() {
  const navigate = useNavigate();
  const [paciente, setPaciente] = useState<any>(null);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // 🧠 CALCULAR PROGRESO
  const calcularProgreso = (tests: Test[]) => {
    const total = tests.length;
    const realizados = tests.filter(t => t.estado === "completado").length;

    return { realizados, total };
  };
  const formatearFecha = (fecha: any) => {
    if (!fecha?.seconds) return "—";
    return new Date(fecha.seconds * 1000).toLocaleDateString("es-AR");
  };
  const { realizados, total } = calcularProgreso(tests);

  // 🧠 CARGAR PACIENTE + TESTS
  useEffect(() => {
    const fetchData = async () => {
      const data = localStorage.getItem("paciente");

      if (!data) return;

      const pacienteParsed = JSON.parse(data);
      setPaciente(pacienteParsed);

      const q = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", pacienteParsed.id)
      );

      const snap = await getDocs(q);

      const testsData = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Test[];

      setTests(testsData);
      setLoading(false);
    };

    fetchData();
  }, []);

  // ⏳ LOADING REAL
  if (loading) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={`nav`}>
        <h2>Tests asignados</h2>
      </div>

      {/* PROGRESO */}
      <nav className={'panelVertical'}>
        <div className="card">
          <h3 className={styles.cardTitle}>Fecha límite</h3>
          <p className={styles.cardResult}>
            {formatearFecha(paciente.fechaFinAcceso)}
          </p>
        </div>
        <div className="card">
          <h3 className={styles.cardTitle}>Tests realizados</h3>
          <p className={styles.cardResult}>
            {realizados} / {total}
          </p>
        </div>
      </nav>

      {/* TABLA */}
      <div className={styles.tablaPacientes}>
        <table className={styles.tabla}>
          <thead>
            <tr>
              <th>Test</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </thead>

          <tbody>
            {tests.map((t) => (
              <tr key={t.id}>
                <td>{t.testId}</td>
                <td>{t.estado}</td>
                <td>
                  <BotonPersonalizado
                    variant="primary"
                    onClick={() => navigate(`/app/test/${t.testId}`)}
                    disabled={t.estado === "completado"}
                  >
                    {t.estado === "completado" ? "✔️ Hecho" : "Comenzar"}
                  </BotonPersonalizado>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}