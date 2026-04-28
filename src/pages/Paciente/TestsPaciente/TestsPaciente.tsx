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
    const realizados = tests.filter((t) => t.estado === "completado").length;

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
        where("pacienteId", "==", pacienteParsed.id),
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
    <div className={`container`}>
      <div className={`layout`}>
        {/* PROGRESO */}
        <div className={"panelVertical"}>
          <div className={`card panelVertical ${styles.cardPaciente}`}>
                <h2>Tests asignados</h2>
                <aside className={styles.sidebar}>
                  <p>
                    <strong>Fecha límite</strong>{" "}
                    {formatearFecha(paciente.fechaFinAcceso)}
                  </p>
                  <p>
                    <strong>Tests realizados</strong>{" "}
                    {realizados} / {total}
                  </p>
                </aside>
              </div>
            
        </div>

        {/* TABLA */}
        <main className="scrollbar">
          <div className="tablaPacientes">
          <table>
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
                    {t.estado === "completado" ? (
                      <BotonPersonalizado
                        variant="secondary"
                        disabled={true}                      
                        >
                        Hecho
                      </BotonPersonalizado>
                    ) : (
                      <BotonPersonalizado
                        variant="primary"
                        onClick={() => navigate(`/app/test/${t.testId}`)}
                        disabled={false}
                      >
                        Comenzar
                      </BotonPersonalizado>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </main>
      </div>
    </div>
  );
}
