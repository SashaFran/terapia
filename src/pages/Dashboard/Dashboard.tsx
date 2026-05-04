import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import { db } from "../../firebase/firebase";
import { collection, getDocs, query, orderBy, limit } from "firebase/firestore";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [testMasUsado, setTestMasUsado] = useState("—");
  const [actividades, setActividades] = useState<any[]>([]);
  const [dataNiveles, setDataNiveles] = useState<any[]>([]);
  const [dataGrafico, setDataGrafico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const calcularTiempoRelativo = (timestamp: any) => {
    if (!timestamp?.toDate) return "Reciente";

    const ahora = new Date();
    const fecha = timestamp.toDate();
    const diff = (ahora.getTime() - fecha.getTime()) / 1000;

    if (diff < 60) return "Hace segundos";
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} hs`;

    return fecha.toLocaleDateString("es-AR");
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const pacientesSnap = await getDocs(collection(db, "pacientes"));
        const resultadosSnap = await getDocs(collection(db, "resultados"));

        const resultados = resultadosSnap.docs.map((d) => d.data());

        setTotalPacientes(pacientesSnap.size);

        const convertir = (pacienteId: any): any => {
          for (const doc of pacientesSnap.docs) {
            if (doc.id === pacienteId) {
              const data = doc.data();
              return `${data.nombre}`;
            }
          }
          return undefined;
        };
        const conteo: Record<string, number> = {};

        resultados.forEach((r) => {
          const test = r.testId || "Sin nombre";
          conteo[test] = (conteo[test] || 0) + 1;
        });

        const total = resultados.length || 1;

        const niveles = Object.keys(conteo).map((test, i) => ({
          label: test,
          valor: Math.round((conteo[test] / total) * 100),
          color: [
            "var(--rojo)",
            "var(--naranja)",
            "var(--opuesto)",
            "var(--bordo)",
            "var(--marron)",
          ][i % 5],
        }));

        niveles.sort((a, b) => b.valor - a.valor);

        setDataNiveles(niveles);
        if (niveles.length) setTestMasUsado(niveles[0].label);

        const meses: Record<string, number> = {};

        resultados.forEach((r) => {
          if (!r.fecha?.toDate) return;

          const fecha = r.fecha.toDate();
          const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;

          meses[key] = (meses[key] || 0) + 1;
        });

        const mesesOrdenados = Object.keys(meses).sort();

        const dataGraf = mesesOrdenados.map((key) => {
          const [year, month] = key.split("-");
          const fecha = new Date(Number(year), Number(month));

          return {
            name: fecha.toLocaleString("es-AR", { month: "short" }),
            p: meses[key],
          };
        });

        setDataGrafico(dataGraf);

        const q = query(
          collection(db, "resultados"),
          orderBy("fecha", "desc"),
          limit(5),
        );

        const snap = await getDocs(q);

        const actividad = snap.docs.map((d) => {
          const data = d.data();

          return {
            titulo: `Evaluación ${data.testId || "—"}`,
            subtitulo: convertir(data.pacienteId) || "Paciente",
            tiempo: calcularTiempoRelativo(data.fecha),
          };
        });

        setActividades(actividad);
      } catch (err) {
        console.error("Error dashboard:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return <div className={styles.loading}>Cargando pantalla...</div>;
  }

  return (
    <div className="container scrollbar">
      <div className="layout">
        <div className={"panelVertical"}>
          <aside className="card paddingHorizontal height-complete">
            <h3>Actividad reciente</h3>
            <div className={styles.feedList}>
              {actividades.map((act, i) => (
                <div key={i} className={styles.feedItem}>
                  <div className={styles.dot}></div>

                  <div className={styles.feedText}>
                    <h4>{act.titulo}</h4>
                    <p>
                      {act.subtitulo}
                    </p>
                    <p>  
                       {act.tiempo}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <main className={`width-complete ${styles.main}`}>
          <div className="nav">
            <div className="card paddingHorizontal">
              <h3>Total Pacientes</h3>
              <p>{totalPacientes}</p>
            </div>

            <div className="card paddingHorizontal">
              <h3>Test más usado</h3>
              <p className={styles.highlight}>{testMasUsado}</p>
            </div>
          </div>
          <div className={styles.chartContainer}>
            <h3>Evolución de pacientes</h3>

            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={dataGrafico}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="var(--gris)"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="var(--marron)" />
                <YAxis allowDecimals={false} stroke="var(--marron)" />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="p"
                  stroke="var(--bordo)"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {}
          <div className="card paddingHorizontal">
            <h3>Uso por Test</h3>

            <div className={`margin ${styles.containerNiveles}`}>
              {dataNiveles.map((n, i) => (
                <div key={i} className={styles.levelRow}>
                  <div className={styles.levelInfo}>
                    <p>{n.label}</p>
                    <p>{n.valor}%</p>
                  </div>

                  <div className={styles.progressBarBg}>
                    <div
                      className={styles.progressBarFill}
                      style={{
                        width: `${n.valor}%`,
                        background: n.color,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
