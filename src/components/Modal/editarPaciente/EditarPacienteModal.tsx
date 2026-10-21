
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

type AsignacionDoc = {
  id: string;
  testId: string;
  estado: string;
};

type Props = {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (data: any) => void;
  paciente: any;
  asignacionesActuales?: string[];
};

const ZONA = "America/Argentina/Buenos_Aires";
const DIA = 24 * 60 * 60 * 1000;

function fechaDe(valor: any): Date | null {
  if (!valor) return null;

  const fecha =
    typeof valor.toDate === "function"
      ? valor.toDate()
      : typeof valor.seconds === "number"
        ? new Date(valor.seconds * 1000)
        : new Date(valor);

  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

function fechaInput(fecha: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(fecha);
}

function inicioFecha(fecha: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return null;

  const inicio = new Date(`${fecha}T09:00:00-03:00`);

  if (
    Number.isNaN(inicio.getTime()) ||
    fechaInput(inicio) !== fecha
  ) {
    return null;
  }

  return inicio;
}

function mostrarFecha(fecha: Date | null): string {
  if (!fecha) return "—";

  return new Intl.DateTimeFormat("es-AR", {
    timeZone: ZONA,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(fecha);
}

function nombreEstado(estado: string): string {
  switch (estado) {
    case "completado":
      return "Completado";
    case "pendiente":
      return "Pendiente";
    case "abandono":
      return "Abandonado";
    case "en_progreso":
    case "en_curso":
      return "En curso";
    default:
      return estado || "Sin asignar";
  }
}

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

  const [asignaciones, setAsignaciones] = useState<AsignacionDoc[]>([]);
  const [modo, setModo] = useState<Modo>("ninguno");

  // Los resultados completados se protegen.
  const [conservarCompletados, setConservarCompletados] =
    useState(true);

  // IDs de asignaciones abandonadas que se recuperarán.
  const [manual, setManual] = useState<string[]>([]);

  // IDs de tipos de test que aún no tiene el paciente.
  const [nuevosTests, setNuevosTests] = useState<string[]>([]);

  const [guardando, setGuardando] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  const estadoReal =
    paciente?.accesoEstado ??
    (paciente?.activo === false ? "inactiva" : "activa");

  const bloqueada =
    estadoReal === "abandonada" ||
    estadoReal === "finalizada";

  const abandonadas = useMemo(
    () => asignaciones.filter((a) => a.estado === "abandono"),
    [asignaciones],
  );

  const pendientes = useMemo(
    () => asignaciones.filter((a) => a.estado === "pendiente"),
    [asignaciones],
  );

  const completadas = useMemo(
    () => asignaciones.filter((a) => a.estado === "completado"),
    [asignaciones],
  );

  const testsExistentes = useMemo(
    () => new Set(asignaciones.map((a) => a.testId)),
    [asignaciones],
  );

  const inicio = useMemo(
    () => inicioFecha(fechaIngreso),
    [fechaIngreso],
  );

  const fin = inicio
    ? new Date(inicio.getTime() + DIA)
    : null;

  useEffect(() => {
    if (!abierto || !paciente?.id) return;

    let vigente = true;

    setError("");
    setModo("ninguno");
    setManual([]);
    setNuevosTests([]);
    setConservarCompletados(true);
    setActivo(paciente.activo !== false);
    setReactivar(false);
    setAsignaciones([]);

    const inicial = fechaDe(paciente.fechaInicioAcceso);
    const final = fechaDe(paciente.fechaFinAcceso);

    setFechaIngreso(
      fechaInput(
        inicial ??
          (final
            ? new Date(final.getTime() - DIA)
            : new Date()),
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

        setAsignaciones(
          snap.docs.map((documento) => ({
            id: documento.id,
            testId: String(documento.data().testId ?? ""),
            estado: String(documento.data().estado ?? ""),
          })),
        );
      })
      .catch((e) => {
        if (vigente) {
          setError(
            `No se pudieron cargar las evaluaciones: ${
              e?.message ?? String(e)
            }`,
          );
        }
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

  const cambiarModo = (nuevoModo: Modo) => {
    setModo(nuevoModo);
    setManual([]);
    setError("");
  };

  const alternarAbandonado = (id: string) => {
    setManual((actual) =>
      actual.includes(id)
        ? actual.filter((x) => x !== id)
        : [...actual, id],
    );
  };

  const alternarNuevo = (testId: string) => {
    if (testsExistentes.has(testId)) return;

    setNuevosTests((actual) =>
      actual.includes(testId)
        ? actual.filter((x) => x !== testId)
        : [...actual, testId],
    );
  };

  const guardar = async () => {
    if (
      !paciente?.id ||
      !inicio ||
      !fin ||
      cargando ||
      guardando
    ) {
      return;
    }

    setError("");

    if (!conservarCompletados) {
      setError(
        "La eliminación o sustitución de resultados completados " +
          "requiere una operación administrativa específica. " +
          "Para continuar, activá 'Conservar evaluaciones completadas'.",
      );
      return;
    }

    if (reactivar && !activo) {
      setError("Para reactivar, seleccioná Activo.");
      return;
    }

    if (bloqueada && activo && !reactivar) {
      setError(
        "La cuenta está bloqueada. Seleccioná la recuperación " +
          "administrativa para habilitarla.",
      );
      return;
    }

    if (reactivar && fin.getTime() <= Date.now()) {
      setError("El nuevo período de acceso ya estaría vencido.");
      return;
    }

    // El backend actual permite recuperar abandonadas.
    // Las pendientes se conservan automáticamente.
    const asignacionIds = modo === "manual" ? manual : [];

    const recuperar =
      reactivar ||
      modo === "abandonados" ||
      (modo === "manual" && asignacionIds.length > 0);

    const cantidadRecuperadas =
      modo === "abandonados"
        ? abandonadas.length
        : modo === "manual"
          ? asignacionIds.length
          : 0;

    const hayCambiosTests =
      cantidadRecuperadas > 0 ||
      nuevosTests.length > 0;

    if (recuperar || hayCambiosTests) {
      const confirmado = window.confirm(
        [
          "¿Confirmás los cambios del paciente?",
          "",
          `Cuenta: ${
            reactivar ? "Generar nuevo acceso" : "Conservar acceso"
          }`,
          `Resultados completados conservados: ${completadas.length}`,
          `Pendientes conservadas: ${pendientes.length}`,
          `Abandonadas a recuperar: ${cantidadRecuperadas}`,
          `Tests nuevos a asignar: ${nuevosTests.length}`,
          "",
          "Los resultados completados no se eliminarán.",
        ].join("\n"),
      );

      if (!confirmado) return;
    }

    setGuardando(true);

    try {
      if (recuperar) {
        const recuperarAcceso = httpsCallable(
          getFunctions(),
          "recuperarAccesoPacienteAuth",
        );

        await recuperarAcceso({
          pacienteId: paciente.id,
          reactivarCuenta: reactivar,
          modoTests: modo,
          asignacionIds,
          ...(reactivar
            ? { fechaInicioAccesoMs: inicio.getTime() }
            : {}),
        });
      }

      // La función de recuperación gestiona las fechas
      // cuando se reactiva la cuenta.
      if (!reactivar) {
        await updateDoc(
          doc(db, "pacientes", paciente.id),
          {
            activo: bloqueada ? false : activo,
            fechaInicioAcceso: inicio,
            fechaFinAcceso: fin,
          },
        );
      }

      // Solo se crean tests que no tienen asignación previa.
      for (const testId of nuevosTests) {
        if (testsExistentes.has(testId)) continue;

        await addDoc(collection(db, "asignaciones"), {
          pacienteId: paciente.id,
          testId,
          estado: "pendiente",
          fechaAsignacion: new Date(),
          fechaCompletado: null,
        });
      }

      onGuardar({
        activo: reactivar
          ? true
          : bloqueada
            ? false
            : activo,
        accesoEstado: reactivar
          ? "pendiente"
          : estadoReal,
        fechaInicioAcceso: inicio,
        fechaFinAcceso: fin,
        testsSeleccionados: [
          ...new Set([
            ...asignacionesActuales,
            ...asignaciones.map((a) => a.testId),
            ...nuevosTests,
          ]),
        ],
      });

      onCerrar();
    } catch (e: any) {
      console.error("Error al guardar paciente:", e);

      setError(
        e?.message ?? "No se pudieron guardar los cambios.",
      );
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
        {/* ESTADO DE ACCESO */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Estado del acceso</h3>
              <p>
                Configurá la disponibilidad de la cuenta
                del paciente.
              </p>
            </div>

            <span
              className={`${styles.currentStatus} ${
                bloqueada
                  ? styles.currentStatusDanger
                  : activo
                    ? styles.currentStatusActive
                    : styles.currentStatusInactive
              }`}
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
                La cuenta requiere autorización
                administrativa para generar un nuevo acceso.
              </p>
            </div>
          )}

          <div className={styles.accessGrid}>
            <div className={styles.settingCard}>
              <span className={styles.settingLabel}>
                Estado del usuario
              </span>

              <div className={styles.statusSelector}>
                <button
                  type="button"
                  disabled={guardando}
                  className={`${styles.statusOption} ${
                    activo
                      ? styles.statusOptionSelected
                      : ""
                  }`}
                  onClick={elegirActivo}
                >
                  <span className={styles.optionDotActive} />
                  Activo
                  {activo && (
                    <span className={styles.optionCheck}>
                      ✓
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  disabled={guardando}
                  className={`${styles.statusOption} ${
                    !activo
                      ? styles.statusOptionSelectedDanger
                      : ""
                  }`}
                  onClick={elegirInactivo}
                >
                  <span className={styles.optionDotInactive} />
                  Inactivo
                  {!activo && (
                    <span className={styles.optionCheck}>
                      ✓
                    </span>
                  )}
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
                        setFechaIngreso(
                          fechaInput(new Date()),
                        );
                      }
                    }}
                  />
                  {" "}
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
                <span className={styles.settingLabel}>
                  Fecha de ingreso
                </span>
                <span className={styles.calendarMark}>
                  24h
                </span>
              </div>

              <div className={styles.dateField}>
                <input
                  type="date"
                  value={fechaIngreso}
                  disabled={guardando}
                  onChange={(e) =>
                    setFechaIngreso(e.target.value)
                  }
                />
              </div>

              <p className={styles.settingHelp}>
                Inicio 09:00 · Vencimiento:{" "}
                {mostrarFecha(fin)}
              </p>
            </div>
          </div>
        </section>

        {/* RECUPERACIÓN DE EVALUACIONES */}
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <div>
              <h3>Gestión de evaluaciones</h3>
              <p>
                Conservá los resultados y configurá
                las evaluaciones disponibles.
              </p>
            </div>

            <span className={styles.testCounter}>
              {asignaciones.length} asignadas
            </span>
          </div>

          {/* OPCIÓN INDEPENDIENTE */}
          <div className={styles.settingCard}>
            <label className={styles.recoveryCheckbox}>
              <input
                type="checkbox"
                checked={conservarCompletados}
                disabled={guardando || cargando}
                onChange={(e) =>
                  setConservarCompletados(e.target.checked)
                }
              />
              {" "}
              <strong>
                Conservar evaluaciones completadas
                ({completadas.length})
              </strong>
            </label>

            <p className={styles.settingHelp}>
              Mantiene los resultados clínicos ya
              completados. Esta opción es independiente
              de la recuperación de otros tests.
            </p>

            {!conservarCompletados && (
              <p className={styles.error}>
                La eliminación de resultados completados
                todavía no está habilitada en esta operación.
                Activá esta opción para guardar.
              </p>
            )}
          </div>

          {/* OPCIONES EXCLUYENTES */}
          <div className={styles.radioGroup}>
            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "ninguno"}
                onChange={() => cambiarModo("ninguno")}
                disabled={guardando || cargando}
              />
              {" "}
              Mantener pendientes y abandonadas sin cambios
            </label>

            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "abandonados"}
                onChange={() =>
                  cambiarModo("abandonados")
                }
                disabled={guardando || cargando}
              />
              {" "}
              Restablecer todas las abandonadas
              ({abandonadas.length}) y conservar pendientes
            </label>

            <label>
              <input
                type="radio"
                name="modoRecuperacion"
                checked={modo === "manual"}
                onChange={() => cambiarModo("manual")}
                disabled={guardando || cargando}
              />
              {" "}
              Seleccionar evaluaciones manualmente
            </label>
          </div>

          {/* SELECCIÓN MANUAL */}
          {modo === "manual" && (
            <div className={styles.testsGrid}>
              {TESTS.map((test) => {
                const existentes = asignaciones.filter(
                  (a) => a.testId === test.id,
                );

                const completado = existentes.some(
                  (a) => a.estado === "completado",
                );

                const abandonada = existentes.find(
                  (a) => a.estado === "abandono",
                );

                const pendiente = existentes.some(
                  (a) => a.estado === "pendiente",
                );

                const enCurso = existentes.some(
                  (a) =>
                    a.estado === "en_curso" ||
                    a.estado === "en_progreso",
                );

                const esNuevo = existentes.length === 0;

                const seleccionado = abandonada
                  ? manual.includes(abandonada.id)
                  : esNuevo
                    ? nuevosTests.includes(test.id)
                    : completado || pendiente || enCurso;

                const editable =
                  Boolean(abandonada) || esNuevo;

                let descripcion = "Sin asignar";

                if (completado) {
                  descripcion = "Completado · protegido";
                } else if (pendiente) {
                  descripcion = "Pendiente · se conserva";
                } else if (enCurso) {
                  descripcion = "En curso · protegido";
                } else if (abandonada) {
                  descripcion = seleccionado
                    ? "Abandonado · se restablecerá"
                    : "Abandonado · sin cambios";
                } else if (esNuevo) {
                  descripcion = seleccionado
                    ? "Nuevo · se asignará"
                    : "Sin asignar · disponible";
                }

                const alternar = () => {
                  if (!editable) return;

                  if (abandonada) {
                    alternarAbandonado(abandonada.id);
                  } else if (esNuevo) {
                    alternarNuevo(test.id);
                  }
                };

                return (
                  <button
                    key={test.id}
                    type="button"
                    disabled={
                      guardando ||
                      cargando ||
                      !editable
                    }
                    aria-pressed={seleccionado}
                    className={`${styles.testCard} ${
                      seleccionado
                        ? styles.testCardSelected
                        : ""
                    }`}
                    onClick={alternar}
                    title={
                      editable
                        ? descripcion
                        : `No modificable: ${
                            existentes
                              .map((a) =>
                                nombreEstado(a.estado),
                              )
                              .join(", ") || "Sin asignar"
                          }`
                    }
                  >
                    <span className={styles.testCardTop}>
                      <strong>{test.nombre}</strong>

                      <span
                        className={`${styles.checkCircle} ${
                          seleccionado
                            ? styles.checkCircleSelected
                            : ""
                        }`}
                      >
                        {seleccionado ? "✓" : ""}
                      </span>
                    </span>

                    <span className={styles.testDescription}>
                      {descripcion}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* AGREGAR TESTS NUEVOS */}
          {modo !== "manual" && (
            <>
              <div className={styles.sectionHeader}>
                <div>
                  <h3>Agregar nuevos tests</h3>
                  <p>
                    Podés asignar evaluaciones que el
                    paciente todavía no tiene.
                  </p>
                </div>
              </div>

              <div className={styles.testsGrid}>
                {TESTS.filter(
                  (test) =>
                    !testsExistentes.has(test.id),
                ).map((test) => {
                  const seleccionado =
                    nuevosTests.includes(test.id);

                  return (
                    <button
                      key={test.id}
                      type="button"
                      disabled={guardando || cargando}
                      aria-pressed={seleccionado}
                      className={`${styles.testCard} ${
                        seleccionado
                          ? styles.testCardSelected
                          : ""
                      }`}
                      onClick={() =>
                        alternarNuevo(test.id)
                      }
                    >
                      <span className={styles.testCardTop}>
                        <strong>{test.nombre}</strong>

                        <span
                          className={`${styles.checkCircle} ${
                            seleccionado
                              ? styles.checkCircleSelected
                              : ""
                          }`}
                        >
                          {seleccionado ? "✓" : ""}
                        </span>
                      </span>

                      <span className={styles.testDescription}>
                        {test.descripcion} · Nuevo
                      </span>
                    </button>
                  );
                })}
              </div>

              {TESTS.every((test) =>
                testsExistentes.has(test.id),
              ) && (
                <p className={styles.settingHelp}>
                  El paciente ya tiene asignados todos
                  los tipos de test disponibles.
                </p>
              )}
            </>
          )}

          <p className={styles.protection}>
            ♢ Los resultados completados se protegen.
            Las evaluaciones pendientes no se duplican.
            Las abandonadas solamente se restablecen
            cuando lo solicitás.
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
              disabled={
                guardando ||
                cargando ||
                !inicio ||
                !conservarCompletados
              }
            >
              {guardando
                ? "Guardando..."
                : "Guardar cambios"}
            </BotonPersonalizado>
          </div>
        </footer>
      </div>
    </Modal>
  );
}
