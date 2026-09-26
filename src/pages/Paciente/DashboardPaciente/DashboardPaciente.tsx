import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../../../firebase/firebase";
import styles from "./DashboardPaciente.module.css";
import BotonPersonalizado from "../../../components/Boton/Boton";
import type { Asignacion } from "../../../models/asignacion";

export default function DashboardPaciente() {
  const navigate = useNavigate();

  const [paciente, setPaciente] = useState<any>(null);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);

  const calcularProgreso = (asignaciones: any[]) => {
    if (!asignaciones || asignaciones.length === 0) {
      return { realizados: 0, total: 0 };
    }

    const total = asignaciones.length;
    const realizados = asignaciones.filter(
      (a) => a.estado === "completado",
    ).length;

    return { realizados, total };
  };

  const { realizados, total } = calcularProgreso(asignaciones);

  useEffect(() => {
    const data = localStorage.getItem("paciente");

    if (!data) {
      navigate("/login");
      return;
    }

    const parsed = JSON.parse(data);

    const ahora = new Date();
    const fin = parsed.fechaFinAcceso?.seconds
      ? new Date(parsed.fechaFinAcceso.seconds * 1000)
      : null;

    if (!fin || ahora > fin) {
      alert("Acceso expirado");
      localStorage.removeItem("paciente");
      navigate("/login");
      return;
    }

    setPaciente(parsed);
  }, []);

  useEffect(() => {
    const cargarAsignaciones = async () => {
      if (!paciente?.id) return;

      const q = query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", paciente.id),
      );

      const snap = await getDocs(q);

      const asignacionesData = snap.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as Asignacion[];

      setAsignaciones(asignacionesData);
    };

    cargarAsignaciones();
  }, [paciente]);

  const formatearFecha = (fecha: any) => {
    if (!fecha?.seconds) return "—";
    return new Date(fecha.seconds * 1000).toLocaleDateString("es-AR");
  };

  if (!paciente) {
    return (
      <div className={`global-container ${styles.container}`}>
        <h2>Cargando…</h2>
      </div>
    );
  }

  return (
    <div className={`container ${styles.container}`}>
      <div className={`nav`}>
        <h2>
          ¡Bienvenido/a {paciente.nombre} a nuestra plataforma de evaluación!
        </h2>
      </div>
      <div className="layout">
        <nav className={`panelVertical ${styles.sidebar}`}>
          <div className={"card padding"}>
            <h3 className={styles.cardTitle}>DNI</h3>
            <p className={`font-size-small ${styles.cardResult}`}>
              {paciente.dni}
            </p>
          </div>

          <div className="card padding">
            <h3 className={styles.cardTitle}>Fecha límite</h3>
            <p className={`font-size-small ${styles.cardResult}`}>
              {formatearFecha(paciente.fechaFinAcceso)}
            </p>
          </div>

          <div className="card padding">
            <h3 className={styles.cardTitle}>Tests realizados</h3>
            <p className={`font-size-small ${styles.cardResult}`}>
              {realizados} / {total}
            </p>
          </div>
        </nav>

        <div className="card padding">
          <div className="container justify-content-space-around">
            <p className={styles.cardTitle}>
              Para facilitar tu proceso de ingreso, hemos asignado los tests
              psicológicos necesarios en tu perfil. Estos estarán disponibles
              durante las próximas 24 horas (o hasta la fecha indicada en la
              tarjeta superior). Antes de comenzar, por favor tené en cuenta:
            </p>
            <ul>
              <li>
                <strong> Sin interrupciones</strong>: Una vez iniciado un test,
                no podrás pausarlo ni cerrar la página. Si lo hacés, el acceso
                se bloqueará y deberás contactar a administración.
              </li>
              <li>
                <strong>Tiempo estimado</strong>: Te sugerimos disponer de al
                menos 2 horas de tranquilidad para completar el proceso. Si
                tenés el tiempo ahora, ¡adelante! Si no, te recomendamos volver
                cuando puedas dedicarle toda tu atención.
              </li>
              <li>
                <strong>Atención y tiempo</strong>: Cada test tiene un tiempo
                límite. Leé las instrucciones con cuidado y mantené el enfoque
                en cada respuesta.
              </li>
              <li>
                <strong>Identidad</strong>: Para finalizar, te solicitaremos una
                foto de tu DNI para validar tu identidad.
              </li>
            </ul>
            Muchas gracias por tu compromiso.
            <div className={styles.buttonContainer}>
              <BotonPersonalizado
                variant="primary"
                onClick={() => navigate("/app/dni")}
                disabled={false}
              >
                Subir DNI
              </BotonPersonalizado>
              <BotonPersonalizado
                variant="secondary"
                onClick={() => navigate("/app/tests")}
                disabled={false}
              >
                Ver Tests
              </BotonPersonalizado>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}