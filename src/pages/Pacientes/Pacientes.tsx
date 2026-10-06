import { useEffect, useMemo, useState } from "react";
import { collection, getDocs, type DocumentData } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import SearchOutlined from "@mui/icons-material/SearchOutlined";
import PeopleOutline from "@mui/icons-material/PeopleOutline";
import PersonAddAltOutlined from "@mui/icons-material/PersonAddAltOutlined";
import AssignmentOutlined from "@mui/icons-material/AssignmentOutlined";
import { db } from "../../firebase/firebase";
import BotonPersonalizado from "../../components/Boton/Boton";
import NuevoPaciente from "../NuevoPaciente/NuevoPaciente";
import Modal from "../../components/Modal/Modal";
import LoadingState from "../../components/Loading/LoadingState";
import styles from "./Pacientes.module.css";

type EstadoPaciente = "Pendiente" | "Activo" | "Vencido" | "Inactivo";
type Paciente = {
  id: string;
  nombre: string;
  contacto: string;
  dni: string;
  estado: EstadoPaciente;
  fechaIngreso: Date | null;
  testsAsignados: number;
  testsFinalizados: number;
  testsPendientes: number;
};
function dateOf(value: unknown): Date | null {
  if (!value) return null;
  const timestamp = value as { toDate?: () => Date; seconds?: number };
  const date =
    typeof timestamp.toDate === "function"
      ? timestamp.toDate()
      : typeof timestamp.seconds === "number"
        ? new Date(timestamp.seconds * 1000)
        : new Date(value as string);
  return Number.isNaN(date.getTime()) ? null : date;
}
function patientStatus(data: DocumentData): EstadoPaciente {
  const now = new Date(),
    start = dateOf(data.fechaInicioAcceso),
    end = dateOf(data.fechaFinAcceso);
  if (
    data.activo === false ||
    ["abandonada", "finalizada"].includes(data.accesoEstado)
  )
    return "Inactivo";
  if (end && now >= end) return "Vencido";
  if (start && now < start) return "Pendiente";
  return "Activo";
}
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
const pageSize = 10;

export default function Pacientes() {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [patients, setPatients] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [revision, setRevision] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let active = true;
    Promise.all([
      getDocs(collection(db, "pacientes")),
      getDocs(collection(db, "asignaciones")),
    ])
      .then(([patientSnapshot, assignmentSnapshot]) => {
        if (!active) return;
        const counts = new Map<
          string,
          { total: number; completed: number; pending: number }
        >();
        assignmentSnapshot.docs.forEach((document) => {
          const data = document.data();
          const count = counts.get(data.pacienteId) || {
            total: 0,
            completed: 0,
            pending: 0,
          };
          count.total++;
          if (data.estado === "completado") count.completed++;
          if (["pendiente", "en_curso"].includes(data.estado)) count.pending++;
          counts.set(data.pacienteId, count);
        });
        setPatients(
          patientSnapshot.docs
            .map((document) => {
              const data = document.data(),
                count = counts.get(document.id);
              return {
                id: document.id,
                nombre: data.nombre || "Sin nombre",
                contacto: data.contacto || data.email || "",
                dni: String(data.dni || ""),
                estado: patientStatus(data),
                fechaIngreso: dateOf(data.createdAt),
                testsAsignados: count?.total || 0,
                testsFinalizados: count?.completed || 0,
                testsPendientes: count?.pending || 0,
              };
            })
            .sort(
              (a, b) =>
                (b.fechaIngreso?.getTime() || 0) -
                (a.fechaIngreso?.getTime() || 0),
            ),
        );
        setPage(1);
      })
      .catch(() => {
        if (active) setError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [revision]);

  const filtered = useMemo(
    () =>
      patients.filter(
        (patient) =>
          (status === "Todos" || patient.estado === status) &&
          normalize(
            `${patient.nombre} ${patient.contacto} ${patient.dni}`,
          ).includes(normalize(query.trim())),
      ),
    [patients, query, status],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pages);
  const rows = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);
  const newPatients = patients.filter(
    (patient) =>
      patient.fechaIngreso &&
      patient.fechaIngreso >= weekAgo &&
      patient.fechaIngreso <= now,
  ).length;
  const activeAssignments = patients.reduce(
    (total, patient) =>
      total + (patient.estado === "Activo" ? patient.testsPendientes : 0),
    0,
  );
  const completed = patients.reduce(
    (total, patient) => total + patient.testsFinalizados,
    0,
  );

  if (loading) return <LoadingState message="Cargando pacientes…" />;
  if (error)
    return (
      <div className={styles.error} role="alert">
        <h1>No se pudieron cargar los pacientes</h1>
        <p>
          Revisá la conexión y los permisos. No se muestran cifras hasta
          completar la consulta.
        </p>
        <button
          onClick={() => {
            setLoading(true);
            setError(false);
            setRevision((value) => value + 1);
          }}
        >
          Reintentar
        </button>
      </div>
    );

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>GESTIÓN DE PACIENTES</p>
          <h1>Pacientes</h1>
          <p>Administrá pacientes, accesos y evaluaciones asignadas.</p>
        </div>
        <BotonPersonalizado
          variant="primary"
          onClick={() => setShowModal(true)}
          tooltip="Registrar un paciente y asignarle sus tests."
          disabled={false}
        >
          + Nuevo paciente
        </BotonPersonalizado>
      </header>
      <section
        className={styles.metricasGrid}
        aria-label="Métricas de pacientes"
      >
        <article className={styles.metricaCard}>
          <span className={styles.statIcon}>
            <PeopleOutline />
          </span>
          <div>
            <span>Total de pacientes</span>
            <strong>{patients.length}</strong>
            <small>
              {patients.filter((patient) => patient.estado === "Activo").length}{" "}
              con acceso activo
            </small>
          </div>
        </article>
        <article className={styles.metricaCard}>
          <span className={`${styles.statIcon} ${styles.coral}`}>
            <PersonAddAltOutlined />
          </span>
          <div>
            <span>Nuevos registros</span>
            <strong>{newPatients}</strong>
            <small>Durante los últimos 7 días</small>
          </div>
        </article>
        <article className={styles.metricaCard}>
          <span className={`${styles.statIcon} ${styles.yellow}`}>
            <AssignmentOutlined />
          </span>
          <div>
            <span>Evaluaciones por completar</span>
            <strong>{activeAssignments}</strong>
            <small>
              En pacientes activos · {completed} completadas en total
            </small>
          </div>
        </article>
      </section>
      <section className={styles.tableSection}>
        <header className={styles.tableHeader}>
          <div>
            <h2>Pacientes registrados</h2>
            <p>
              {filtered.length}{" "}
              {filtered.length === 1 ? "resultado" : "resultados"} en el sistema
            </p>
          </div>
          <div className={styles.controls}>
            <label className={styles.search}>
              <SearchOutlined fontSize="small" />
              <input
                aria-label="Filtrar pacientes por nombre, DNI o contacto"
                placeholder="Buscar paciente…"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            <select
              aria-label="Filtrar por estado"
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
            >
              {["Todos", "Activo", "Pendiente", "Vencido", "Inactivo"].map(
                (state) => (
                  <option key={state}>{state}</option>
                ),
              )}
            </select>
          </div>
        </header>
        <div className={styles.tablaPacientes}>
          <table>
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Estado</th>
                <th>Fecha de registro</th>
                <th>Evaluaciones</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((patient) => {
                const percent = patient.testsAsignados
                  ? Math.round(
                      (patient.testsFinalizados / patient.testsAsignados) * 100,
                    )
                  : 0;
                return (
                  <tr key={patient.id}>
                    <td>
                      <div className={styles.pacienteCell}>
                        <span className={styles.pacienteAvatar}>
                          {patient.nombre
                            .trim()
                            .split(/\s+/)
                            .slice(0, 2)
                            .map((part) => part[0])
                            .join("")
                            .toUpperCase()}
                        </span>
                        <div className={styles.pacienteInfo}>
                          <strong>{patient.nombre}</strong>
                          <span>
                            {patient.contacto ||
                              (patient.dni
                                ? `DNI ${patient.dni}`
                                : "Sin contacto informado")}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`${styles.estadoBadge} ${styles[patient.estado.toLowerCase()]}`}
                      >
                        <i />
                        {patient.estado}
                      </span>
                    </td>
                    <td className={styles.fecha}>
                      {patient.fechaIngreso?.toLocaleDateString("es-AR") ||
                        "No registrada"}
                    </td>
                    <td>
                      <div className={styles.progressCell}>
                        <div>
                          <span>
                            {patient.testsFinalizados} de{" "}
                            {patient.testsAsignados} completadas
                          </span>
                          <strong>{percent}%</strong>
                        </div>
                        <div
                          className={styles.progressTrack}
                          role="progressbar"
                          aria-label={`Evaluaciones completadas de ${patient.nombre}`}
                          aria-valuenow={percent}
                          aria-valuemin={0}
                          aria-valuemax={100}
                        >
                          <span style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    </td>
                    <td>
                      <button
                        className={styles.verButton}
                        onClick={() =>
                          navigate(`/admin/paciente/${patient.id}`)
                        }
                        aria-label={`Ver perfil de ${patient.nombre}`}
                      >
                        Ver perfil <span aria-hidden="true">→</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <div className={styles.emptyState}>
            <SearchOutlined />
            <strong>
              {patients.length ? "Sin resultados" : "Todavía no hay pacientes"}
            </strong>
            <span>
              {patients.length
                ? "Probá con otra búsqueda o filtro."
                : "Los pacientes registrados aparecerán acá."}
            </span>
          </div>
        )}
        <footer className={styles.tableFooter}>
          <span>
            Mostrando {rows.length ? (currentPage - 1) * pageSize + 1 : 0}–
            {Math.min(currentPage * pageSize, filtered.length)} de{" "}
            {filtered.length} pacientes
          </span>
          <nav aria-label="Paginación de pacientes">
            <button
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <span>
              Página {currentPage} de {pages}
            </span>
            <button
              disabled={currentPage >= pages}
              onClick={() => setPage(currentPage + 1)}
              aria-label="Página siguiente"
            >
              ›
            </button>
          </nav>
        </footer>
      </section>
      {showModal && (
        <Modal
          abierto
          onCerrar={() => setShowModal(false)}
          titulo="Registrar nuevo paciente"
        >
          <NuevoPaciente
            onClose={() => setShowModal(false)}
            onPacienteCreado={() => {
              setLoading(true);
              setError(false);
              setRevision((value) => value + 1);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
