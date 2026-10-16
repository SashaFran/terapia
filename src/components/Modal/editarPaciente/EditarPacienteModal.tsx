import { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../../../firebase/firebase";
import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../Modal";
import styles from "./EditarPacienteModal.module.css";

const TESTS = [
  { id: "k10", nombre: "K-10", descripcion: "Escala Kessler" },
  { id: "bfq", nombre: "BFQ", descripcion: "Personalidad" },
  { id: "zulliger", nombre: "Zulliger", descripcion: "Técnica proyectiva" },
  { id: "bender", nombre: "Bender", descripcion: "Evaluación visomotora" },
  { id: "raven", nombre: "Raven", descripcion: "Matrices progresivas" },
];
type Modo = "ninguno" | "abandonados" | "manual";
type AsignacionDoc = { id: string; testId: string; estado: string };
type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (data: any) => void;
  paciente: any;
  asignacionesActuales?: string[];
};
const ZONA = "America/Argentina/Buenos_Aires";
const DIA = 86400000;
const fechaDe = (v: any): Date | null => {
  if (!v) return null;
  const d =
    typeof v.toDate === "function"
      ? v.toDate()
      : typeof v.seconds === "number"
        ? new Date(v.seconds * 1000)
        : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fechaInput = (d: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
// Argentina mantiene UTC-03:00; construir a las 09:00 de Buenos Aires, sin depender del equipo del admin.
function inicioFecha(fecha: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;
  const d = new Date(`${fecha}T09:00:00-03:00`);
  return Number.isNaN(d.getTime()) || fechaInput(d) !== fecha ? null : d;
}
const mostrarFecha = (d: Date | null) =>
  d
    ? new Intl.DateTimeFormat("es-AR", {
        timeZone: ZONA,
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d)
    : "—";

export default function EditarPacienteModal({
  abierto,
  onCerrar,
  onGuardar,
  paciente,
  asignacionesActuales = [],
}: Props) {
  const [activo, setActivo] = useState(true);
  const [reactivar, setReactivar] = useState(false);
  const [fechaIngreso, setFechaIngreso] = useState("");
  const [testsSeleccionados, setTestsSeleccionados] = useState<string[]>([]);
  const [asignaciones, setAsignaciones] = useState<AsignacionDoc[]>([]);
  const [modo, setModo] = useState<Modo>("ninguno");
  const [manual, setManual] = useState<string[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const estadoReal =
    paciente?.accesoEstado ??
    (paciente?.activo === false ? "inactiva" : "activa");
  const bloqueada = estadoReal === "abandonada" || estadoReal === "finalizada";
  const abandonadas = useMemo(
    () => asignaciones.filter((a) => a.estado === "abandono"),
    [asignaciones],
  );
  const inicio = useMemo(() => inicioFecha(fechaIngreso), [fechaIngreso]);
  const fin = inicio ? new Date(inicio.getTime() + DIA) : null;

  useEffect(() => {
    if (!abierto || !paciente?.id) return;
    let vigente = true;
    setError("");
    setModo("ninguno");
    setManual([]);
    setActivo(paciente.activo !== false);
    setReactivar(false);
    setTestsSeleccionados(asignacionesActuales);
    const inicial = fechaDe(paciente.fechaInicioAcceso);
    const final = fechaDe(paciente.fechaFinAcceso);
    setFechaIngreso(
      fechaInput(
        inicial ?? (final ? new Date(final.getTime() - DIA) : new Date()),
      ),
    );
    setCargando(true);
    getDocs(
      query(
        collection(db, "asignaciones"),
        where("pacienteId", "==", paciente.id),
      ),
    )
      .then((snap) => {
        if (!vigente) return;
        const docs = snap.docs.map((d) => ({
          id: d.id,
          testId: String(d.data().testId ?? ""),
          estado: String(d.data().estado ?? ""),
        }));
        setAsignaciones(docs);
        setTestsSeleccionados(docs.map((d) => d.testId));
      })
      .catch((e) => {
        if (vigente)
          setError(
            `No se pudieron cargar las asignaciones: ${String(e.message ?? e)}`,
          );
      })
      .finally(() => {
        if (vigente) setCargando(false);
      });
    return () => {
      vigente = false;
    };
  }, [abierto, paciente?.id]);

  const elegirActivo = () => {
    setActivo(true);
    if (bloqueada) {
      setReactivar(true);
      setFechaIngreso(fechaInput(new Date()));
    }
  };
  const elegirInactivo = () => {
    setActivo(false);
    setReactivar(false);
  };
  const cambiarTest = (id: string) => {
    const existente = asignaciones.find((a) => a.testId === id);
    // No permitir borrar historial clínico ni una evaluación en curso.
    if (existente && !["pendiente"].includes(existente.estado)) return;
    setTestsSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };
  const guardar = async () => {
    if (!paciente?.id || !inicio || !fin || cargando || guardando) return;
    setError("");
    if (reactivar && !activo) {
      setError("Para reactivar, seleccioná Activo.");
      return;
    }
    if (bloqueada && activo && !reactivar) {
      setError(
        "La cuenta está bloqueada: seleccioná la recuperación administrativa para habilitarla.",
      );
      return;
    }
    if (reactivar && fin.getTime() <= Date.now()) {
      setError("El nuevo período de acceso ya estaría vencido.");
      return;
    }
    const quitar = asignaciones.filter(
      (a) => !testsSeleccionados.includes(a.testId),
    );
    if (quitar.some((a) => a.estado !== "pendiente")) {
      setError(
        "No se pueden quitar tests iniciados, abandonados o completados.",
      );
      return;
    }
    // La eliminación de asignaciones queda deshabilitada para no perder trazabilidad.
    if (quitar.length) {
      setError(
        "Para preservar el historial, no se pueden quitar asignaciones existentes desde este modal.",
      );
      return;
    }
    const ids = modo === "manual" ? manual : [];
    const recuperar = reactivar || modo !== "ninguno";
    if (
      recuperar &&
      !window.confirm(
        `¿Confirmás la recuperación administrativa?\nCuenta: ${reactivar ? "nuevo acceso" : "sin cambios"}\nTests: ${modo === "abandonados" ? `todos los abandonados (${abandonadas.length})` : modo === "manual" ? `${ids.length} seleccionados` : "ninguno"}\nLos resultados completados se conservarán.`,
      )
    )
      return;
    setGuardando(true);
    try {
      // Primero recuperación protegida por custom claim de administrador.
      if (recuperar) {
        const call = httpsCallable(
          getFunctions(),
          "recuperarAccesoPacienteAuth",
        );
        await call({
          pacienteId: paciente.id,
          reactivarCuenta: reactivar,
          modoTests: modo,
          asignacionIds: ids,
          ...(reactivar ? { fechaInicioAccesoMs: inicio.getTime() } : {}),
        });
      }
      // No sobrescribir las fechas ni el estado que la recuperación acaba de establecer.
      if (!reactivar) {
        await updateDoc(doc(db, "pacientes", paciente.id), {
          activo: bloqueada ? false : activo,
          fechaInicioAcceso: inicio,
          fechaFinAcceso: fin,
        });
      }
      const nuevos = testsSeleccionados.filter(
        (id) => !asignaciones.some((a) => a.testId === id),
      );
      for (const testId of nuevos) {
        await addDoc(collection(db, "asignaciones"), {
          pacienteId: paciente.id,
          testId,
          estado: "pendiente",
          fechaAsignacion: new Date(),
        });
      }
      onGuardar({
        activo: reactivar ? true : bloqueada ? false : activo,
        accesoEstado: reactivar ? "pendiente" : estadoReal,
        fechaInicioAcceso: inicio,
        fechaFinAcceso: fin,
        testsSeleccionados,
      });
      onCerrar();
    } catch (e: any) {
      console.error("Error al guardar paciente:", e);
      setError(e?.message ?? "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  if (!abierto) return null;
  return (
    <Modal
      abierto={abierto}
      onCerrar={guardando ? () => {} : onCerrar}
      titulo={`Configurar paciente: ${paciente?.nombre ?? ""}`}
    >
      <div className={styles.modalLayout}>
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Estado del acceso</h3>
              <p>Configurá la disponibilidad de la cuenta del paciente.</p>
            </div>
            <span
              className={`${styles.currentStatus} ${bloqueada ? styles.currentStatusDanger : activo ? styles.currentStatusActive : styles.currentStatusInactive}`}
            >
              {estadoReal === "abandonada"
                ? "Abandonada"
                : estadoReal === "finalizada"
                  ? "Finalizada"
                  : activo
                    ? "Activo"
                    : "Inactivo"}
            </span>
          </div>
          {bloqueada && (
            <div className={styles.warning}>
              <strong>⚠ Cuenta inhabilitada</strong>
              <p>
                {estadoReal === "abandonada"
                  ? "La sesión anterior terminó por abandono o interrupción. Se requiere autorización administrativa."
                  : "El acceso anterior finalizó. Se requiere autorización administrativa para generar uno nuevo."}
              </p>
            </div>
          )}
          <div className={styles.accessGrid}>
            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>Estado del usuario</span>
              <div className={styles.statusSelector}>
                <button
                  type="button"
                  disabled={guardando}
                  className={`${styles.statusOption} ${activo ? styles.statusOptionSelected : ""}`}
                  onClick={elegirActivo}
                >
                  <span className={styles.optionDotActive} />
                  Activo{" "}
                  {activo && <span className={styles.optionCheck}>✓</span>}
                </button>
                <button
                  type="button"
                  disabled={guardando}
                  className={`${styles.statusOption} ${!activo ? styles.statusOptionSelectedDanger : ""}`}
                  onClick={elegirInactivo}
                >
                  <span className={styles.optionDotInactive} />
                  Inactivo{" "}
                  {!activo && <span className={styles.optionCheck}>✓</span>}
                </button>
              </div>
              {bloqueada ? (
                <label className={styles.recoveryCheckbox}>
                  <input
                    type="checkbox"
                    checked={reactivar}
                    disabled={guardando}
                    onChange={(e) => {
                      setReactivar(e.target.checked);
                      if (e.target.checked) {
                        setActivo(true);
                        setFechaIngreso(fechaInput(new Date()));
                      }
                    }}
                  />{" "}
                  Reactivar cuenta y generar nuevo acceso
                </label>
              ) : (
                <p className={styles.settingHelp}>
                  {activo
                    ? "El paciente puede ingresar mientras su período esté vigente."
                    : "El paciente no podrá ingresar mientras permanezca inactivo."}
                </p>
              )}
            </div>
            <div className={styles.settingCard}>
              <div className={styles.settingTop}>
                <span className={styles.settingLabel}>Fecha de ingreso</span>
                <span className={styles.calendarMark}>24h</span>
              </div>
              <div className={styles.dateField}>
                <input
                  type="date"
                  value={fechaIngreso}
                  disabled={guardando}
                  onChange={(e) => setFechaIngreso(e.target.value)}
                />
              </div>
              <p className={styles.settingHelp}>
                Inicio 09:00 · Vencimiento: {mostrarFecha(fin)}
              </p>
            </div>
          </div>
        </section>
        {/* <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Tests asignados</h3>
              <p>Seleccioná las evaluaciones disponibles para este paciente.</p>
            </div>
            <span className={styles.testCounter}>
              {testsSeleccionados.length} de {TESTS.length} seleccionados
            </span>
          </div>
          <div className={styles.testsGrid}>
            {TESTS.map((t) => {
              const selected = testsSeleccionados.includes(t.id);
              const existing = asignaciones.find((a) => a.testId === t.id);
              const locked = !!existing && existing.estado !== "pendiente";
              return (
                <button
                  key={t.id}
                  type="button"
                  className={`${styles.testCard} ${selected ? styles.testCardSelected : ""}`}
                  onClick={() => cambiarTest(t.id)}
                  disabled={guardando || cargando || locked}
                  title={
                    locked
                      ? `No se puede quitar: ${existing?.estado}`
                      : undefined
                  }
                  aria-pressed={selected}
                >
                  <span className={styles.testCardTop}>
                    <strong>{t.nombre}</strong>
                    <span
                      className={`${styles.checkCircle} ${selected ? styles.checkCircleSelected : ""}`}
                    >
                      {selected ? "✓" : ""}
                    </span>
                  </span>
                  <span className={styles.testDescription}>
                    {t.descripcion}
                  </span>
                </button>
              );
            })}
          </div>
        </section> */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Recuperación de evaluaciones</h3>
              <p>Elegí cómo restablecer los tests abandonados.</p>
            </div>
            <span className={styles.testCounter}>Administración</span>
          </div>
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "ninguno"}
                onChange={() => setModo("ninguno")}
                disabled={guardando}
              />{" "}
              Conservar los estados actuales
            </label>
            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "abandonados"}
                onChange={() => setModo("abandonados")}
                disabled={guardando}
              />{" "}
              Restablecer todas las abandonadas ({abandonadas.length})
            </label>
            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "manual"}
                onChange={() => setModo("manual")}
                disabled={guardando}
              />{" "}
              Seleccionar tests manualmente
            </label>
          </div>
          {modo === "manual" && (
            <div className={styles.testsGrid}>
              {TESTS.map((t) => {
                const a = abandonadas.find((a) => a.testId === t.id);
                const checked = !!a && manual.includes(a.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={!a || guardando}
                    aria-pressed={checked}
                    className={`${styles.testCard} ${checked ? styles.testCardSelected : ""}`}
                    onClick={() =>
                      a &&
                      setManual((prev) =>
                        checked
                          ? prev.filter((id) => id !== a.id)
                          : [...prev, a.id],
                      )
                    }
                  >
                    <span className={styles.testCardTop}>
                      <strong>{t.nombre}</strong>
                      <span
                        className={`${styles.checkCircle} ${checked ? styles.checkCircleSelected : ""}`}
                      >
                        {checked ? "✓" : ""}
                      </span>
                    </span>
                    <span className={styles.testDescription}>
                      {a
                        ? "Abandonado · recuperable"
                        : (asignaciones.find((x) => x.testId === t.id)
                            ?.estado ?? "Sin asignar")}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
          <p className={styles.protection}>
            ♢ Los resultados completados se conservan. Solo se reinician
            evaluaciones abandonadas.
          </p>
        </section>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <footer className={styles.modalFooter}>
          <p className={styles.footerHint}>
            Los cambios se aplicarán al confirmar.
          </p>
          <div className={styles.modalButtons}>
            <BotonPersonalizado
              variant="secondary"
              onClick={onCerrar}
              disabled={guardando}
            >
              Cancelar
            </BotonPersonalizado>
            <BotonPersonalizado
              variant="primary"
              onClick={guardar}
              disabled={guardando || cargando || !inicio}
            >
              {guardando ? "Guardando..." : "Guardar cambios"}
            </BotonPersonalizado>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
