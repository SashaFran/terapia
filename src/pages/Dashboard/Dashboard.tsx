import { useEffect, useState } from "react";
import styles from "./Dashboard.module.css";
import { db } from "../../firebase/firebase";
import { collection, getDocs } from "firebase/firestore";

interface Resultado {
  id: string;
  fecha?: any;
}

export default function Dashboard() {
  const [totalPacientes, setTotalPacientes] = useState<number>(0);
  const [totalSesiones, setTotalSesiones] = useState<number>(0);
  const [ultimaSesion, setUltimaSesion] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const formatearFecha = (timestamp: any): string => {
    if (!timestamp || !timestamp.toDate) return "—";
    return timestamp.toDate().toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 🔹 Total pacientes
        const pacientesSnap = await getDocs(collection(db, "pacientes"));
        setTotalPacientes(pacientesSnap.size);

        // 🔹 Total sesiones
        const sesionesSnap = await getDocs(collection(db, "resultados"));
        setTotalSesiones(sesionesSnap.size);

        // 🔹 Resultados (para última fecha)
        const resultadosSnap = await getDocs(collection(db, "resultados"));
        const resultados: Resultado[] = resultadosSnap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));

        const ultimaFecha =
          resultados
            .map((r) => r.fecha)
            .filter(Boolean)
            .sort((a, b) => b.seconds - a.seconds)[0] || null;

        setUltimaSesion(ultimaFecha);
      } catch (error) {
        console.error("Error cargando dashboard:", error);
        setUltimaSesion(null);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div className={`global-container ${styles.container}`}>
      <div className={styles.nav}>
        <h2>Dashboard inicial</h2>
      </div>
      <nav className={styles.navCards}>
        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Total pacientes</h3>
          <p className={styles.cardResult}>{totalPacientes}</p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Total sesiones</h3>
          <p className={styles.cardResult}>{totalSesiones}</p>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Última sesión</h3>
          <p className={styles.cardResult}>
            {ultimaSesion ? formatearFecha(ultimaSesion) : "—"}
          </p>
        </div>
      </nav>
    </div>
  );
}
