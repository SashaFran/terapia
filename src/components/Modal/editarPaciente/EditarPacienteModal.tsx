import { useEffect, useMemo, useState } from "react";

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import BotonPersonalizado from "../../Boton/Boton";
import Modal from "../Modal";

import { db } from "../../../firebase/firebase";

import styles from "./EditarPacienteModal.module.css";

/* =========================================================
   TESTS
========================================================= */

const TESTS_DISPONIBLES = [
  {
    id: "k10",
    nombre: "K-10",
    descripcion: "Escala Kessler",
  },
  {
    id: "bfq",
    nombre: "BFQ",
    descripcion: "Personalidad",
  },
  {
    id: "zulliger",
    nombre: "Zulliger",
    descripcion: "Técnica proyectiva",
  },
  {
    id: "bender",
    nombre: "Bender",
    descripcion: "Evaluación visomotora",
  },
  {
    id: "raven",
    nombre: "Raven",
    descripcion: "Matrices progresivas",
  },
];

/* =========================================================
   PROPS
========================================================= */

interface Props {
  abierto: boolean;
  onCerrar: () => void;
  onGuardar: (data: any) => void;
  paciente: any;
  asignacionesActuales?: string[];
}

/* =========================================================
   FECHAS
========================================================= */

function convertirFecha(fecha: any): Date | null {
  if (!fecha) return null;

  if (typeof fecha.toDate === "function") {
    return fecha.toDate();
  }

  if (typeof fecha.seconds === "number") {
    return new Date(fecha.seconds * 1000);
  }

  const date = new Date(fecha);

  return Number.isNaN(date.getTime())
    ? null
    : date;
}

/*
 * Convierte una fecha Date a YYYY-MM-DD usando
 * componentes LOCALES.
 *
 * Evitamos toISOString() para no introducir
 * desplazamientos por UTC.
 */
function fechaParaInput(fecha: Date): string {
  const year = fecha.getFullYear();

  const month = String(
    fecha.getMonth() + 1,
  ).padStart(2, "0");

  const day = String(
    fecha.getDate(),
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

/*
 * Convierte YYYY-MM-DD a una fecha local
 * exactamente a las 09:00.
 */
function crearInicioAcceso(
  fecha: string,
): Date | null {
  const partes = fecha
    .split("-")
    .map(Number);

  if (
    partes.length !== 3 ||
    partes.some((parte) =>
      Number.isNaN(parte),
    )
  ) {
    return null;
  }

  const [year, month, day] = partes;

  const date = new Date(
    year,
    month - 1,
    day,
    9,
    0,
    0,
    0,
  );

  /*
   * Validamos también que JS no haya normalizado
   * silenciosamente una fecha inválida.
   */
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/*
 * El vencimiento es exactamente 24 horas
 * después del inicio.
 */
function calcularFinAcceso(
  inicio: Date,
): Date {
  return new Date(
    inicio.getTime() +
      24 * 60 * 60 * 1000,
  );
}

function formatearFechaHora(
  fecha: Date | null,
): string {
  if (!fecha) return "—";

  return fecha.toLocaleString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/* =========================================================
   COMPONENTE
========================================================= */

export default function EditarPacienteModal({
  abierto,
  onCerrar,
  onGuardar,
  paciente,
  asignacionesActuales = [],
}: Props) {
  const [activo, setActivo] =
    useState(true);

  /*
   * Ahora guardamos la FECHA DE INGRESO,
   * no la fecha de vencimiento.
   */
  const [fechaIngreso, setFechaIngreso] =
    useState("");

  const [
    testsSeleccionados,
    setTestsSeleccionados,
  ] = useState<string[]>([]);

  const [guardando, setGuardando] =
    useState(false);

  /* =======================================================
     CARGAR DATOS
  ======================================================= */

  useEffect(() => {
    if (!abierto || !paciente) return;

    setActivo(
      paciente.activo !== false,
    );

    setTestsSeleccionados(
      asignacionesActuales,
    );

    /*
     * Si ya existe fecha de inicio, mostramos
     * ese mismo día en el input.
     */
    const inicioActual = convertirFecha(
      paciente.fechaInicioAcceso,
    );

    if (inicioActual) {
      setFechaIngreso(
        fechaParaInput(inicioActual),
      );

      return;
    }

    /*
     * Compatibilidad con pacientes antiguos:
     *
     * si por algún motivo sólo existe fechaFinAcceso,
     * inferimos el inicio restando 24 horas.
     */
    const finActual = convertirFecha(
      paciente.fechaFinAcceso,
    );

    if (finActual) {
      const inicioInferido = new Date(
        finActual.getTime() -
          24 * 60 * 60 * 1000,
      );

      setFechaIngreso(
        fechaParaInput(inicioInferido),
      );

      return;
    }

    /*
     * Si no hay ninguna fecha registrada,
     * proponemos hoy.
     */
    setFechaIngreso(
      fechaParaInput(new Date()),
    );
  }, [
    abierto,
    paciente,
    asignacionesActuales,
  ]);

  /* =======================================================
     REACTIVAR PACIENTE
  ======================================================= */

  useEffect(() => {
    if (!abierto || !paciente) return;

    /*
     * Si estaba inactivo y el administrador
     * lo reactiva, proponemos hoy como nueva
     * fecha de ingreso.
     *
     * El inicio será hoy a las 09:00 y el
     * vencimiento mañana a las 09:00.
     *
     * El admin igualmente puede cambiar el día
     * antes de guardar.
     */
    if (
      paciente.activo === false &&
      activo
    ) {
      setFechaIngreso(
        fechaParaInput(new Date()),
      );
    }
  }, [activo, abierto, paciente]);

  /* =======================================================
     FECHAS DERIVADAS
  ======================================================= */

  const fechaInicioCalculada =
    useMemo(() => {
      if (!fechaIngreso) {
        return null;
      }

      return crearInicioAcceso(
        fechaIngreso,
      );
    }, [fechaIngreso]);

  const fechaFinCalculada =
    useMemo(() => {
      if (!fechaInicioCalculada) {
        return null;
      }

      return calcularFinAcceso(
        fechaInicioCalculada,
      );
    }, [fechaInicioCalculada]);

  /* =======================================================
     TOGGLE TEST
  ======================================================= */

  const toggleTest = (
    testId: string,
  ) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter(
            (test) =>
              test !== testId,
          )
        : [...prev, testId],
    );
  };

  /* =======================================================
     GUARDAR
  ======================================================= */

  const manejarGuardar =
    async () => {
      if (!paciente?.id) {
        console.error(
          "No se encontró el ID del paciente para actualizar",
        );

        return;
      }

      if (!fechaIngreso) {
        alert(
          "Seleccioná una fecha de ingreso.",
        );

        return;
      }

      const inicio =
        crearInicioAcceso(
          fechaIngreso,
        );

      if (!inicio) {
        alert(
          "La fecha de ingreso no es válida.",
        );

        return;
      }

      const fin =
        calcularFinAcceso(inicio);

      try {
        setGuardando(true);

        /* -------------------------
           PACIENTE
        ------------------------- */

        const pacienteRef = doc(
          db,
          "pacientes",
          paciente.id,
        );

        await updateDoc(
          pacienteRef,
          {
            activo,

            /*
             * Siempre guardamos las dos fechas
             * juntas para mantener una ventana
             * exacta de 24 horas.
             */
            fechaInicioAcceso:
              inicio,

            fechaFinAcceso:
              fin,
          },
        );

        /* -------------------------
           ASIGNACIONES ACTUALES
        ------------------------- */

        const asignacionesSnap =
          await getDocs(
            query(
              collection(
                db,
                "asignaciones",
              ),
              where(
                "pacienteId",
                "==",
                paciente.id,
              ),
            ),
          );

        const actuales =
          asignacionesSnap.docs.map(
            (documento) => ({
              id: documento.id,

              testId:
                documento.data()
                  .testId,
            }),
          );

        /* -------------------------
           NUEVOS
        ------------------------- */

        const nuevos =
          testsSeleccionados.filter(
            (test) =>
              !actuales.some(
                (asignacion) =>
                  asignacion.testId ===
                  test,
              ),
          );

        /* -------------------------
           ELIMINADOS
        ------------------------- */

        const eliminados =
          actuales.filter(
            (asignacion) =>
              !testsSeleccionados.includes(
                asignacion.testId,
              ),
          );

        const crear = nuevos.map(
          (testId) =>
            addDoc(
              collection(
                db,
                "asignaciones",
              ),
              {
                pacienteId:
                  paciente.id,

                testId,

                estado:
                  "pendiente",

                fechaAsignacion:
                  new Date(),
              },
            ),
        );

        const borrar =
          eliminados.map(
            (asignacion) =>
              deleteDoc(
                doc(
                  db,
                  "asignaciones",
                  asignacion.id,
                ),
              ),
          );

        await Promise.all([
          ...crear,
          ...borrar,
        ]);

        /*
         * Informamos al perfil AMBAS fechas.
         */
        onGuardar({
          activo,

          fechaInicioAcceso:
            inicio,

          fechaFinAcceso:
            fin,

          testsSeleccionados,
        });

        onCerrar();
      } catch (error) {
        console.error(
          "Error al guardar:",
          error,
        );

        alert(
          "No se pudieron guardar los cambios.",
        );
      } finally {
        setGuardando(false);
      }
    };

  /* =======================================================
     RENDER
  ======================================================= */

  if (!abierto) return null;

  return (
    <Modal
      abierto={abierto}
      onCerrar={
        guardando
          ? () => {}
          : onCerrar
      }
      titulo={`Configurar paciente: ${
        paciente?.nombre || ""
      }`}
    >
      <div
        className={
          styles.modalLayout
        }
      >
        {/* ===============================================
            ACCESO
        =============================================== */}

        <section
          className={
            styles.section
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div>
              <h3>
                Estado del acceso
              </h3>

              <p>
                Configurá la
                disponibilidad de la
                cuenta del paciente.
              </p>
            </div>

            <span
              className={`${styles.currentStatus} ${
                activo
                  ? styles.currentStatusActive
                  : styles.currentStatusInactive
              }`}
            >
              <span />

              {activo
                ? "Activo"
                : "Inactivo"}
            </span>
          </div>

          <div
            className={
              styles.accessGrid
            }
          >
            {/* ESTADO */}

            <div
              className={
                styles.settingCard
              }
            >
              <div
                className={
                  styles.settingTop
                }
              >
                <div>
                  <span
                    className={
                      styles.settingLabel
                    }
                  >
                    Estado del usuario
                  </span>

                  <strong>
                    {activo
                      ? "Acceso habilitado"
                      : "Acceso deshabilitado"}
                  </strong>
                </div>

                <span
                  className={`${styles.accessDot} ${
                    activo
                      ? styles.accessDotActive
                      : styles.accessDotInactive
                  }`}
                />
              </div>

              <div
                className={
                  styles.statusSelector
                }
              >
                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    activo
                      ? styles.statusOptionSelected
                      : ""
                  }`}
                  onClick={() =>
                    setActivo(true)
                  }
                  disabled={
                    guardando
                  }
                >
                  <span
                    className={
                      styles.optionDotActive
                    }
                  />

                  Activo

                  {activo && (
                    <span
                      className={
                        styles.optionCheck
                      }
                    >
                      ✓
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  className={`${styles.statusOption} ${
                    !activo
                      ? styles.statusOptionSelectedDanger
                      : ""
                  }`}
                  onClick={() =>
                    setActivo(false)
                  }
                  disabled={
                    guardando
                  }
                >
                  <span
                    className={
                      styles.optionDotInactive
                    }
                  />

                  Inactivo

                  {!activo && (
                    <span
                      className={
                        styles.optionCheck
                      }
                    >
                      ✓
                    </span>
                  )}
                </button>
              </div>

              <p
                className={
                  styles.settingHelp
                }
              >
                {activo
                  ? "El paciente puede ingresar mientras su período esté vigente."
                  : "El paciente no podrá ingresar aunque la fecha de acceso siga vigente."}
              </p>
            </div>

            {/* FECHA DE INGRESO */}

            <div
              className={
                styles.settingCard
              }
            >
              <div
                className={
                  styles.settingTop
                }
              >
                <div>
                  <span
                    className={
                      styles.settingLabel
                    }
                  >
                    Fecha de ingreso
                  </span>

                  <strong>
                    Inicio del acceso
                  </strong>
                </div>

                <span
                  className={
                    styles.calendarMark
                  }
                >
                  24h
                </span>
              </div>

              <div
                className={
                  styles.dateField
                }
              >
                <input
                  type="date"
                  value={
                    fechaIngreso
                  }
                  onChange={(
                    event,
                  ) =>
                    setFechaIngreso(
                      event.target
                        .value,
                    )
                  }
                  disabled={
                    guardando
                  }
                />
              </div>

              <p
                className={
                  styles.settingHelp
                }
              >
                El acceso comienza a
                las 09:00 y permanece
                habilitado durante 24
                horas.
              </p>

              {fechaFinCalculada && (
                <p
                  className={
                    styles.settingHelp
                  }
                >
                  <strong>
                    Vencimiento
                    automático:
                  </strong>{" "}
                  {formatearFechaHora(
                    fechaFinCalculada,
                  )}
                </p>
              )}
            </div>
          </div>
        </section>

        {/* ===============================================
            TESTS
        =============================================== */}

        <section
          className={
            styles.section
          }
        >
          <div
            className={
              styles.sectionHeader
            }
          >
            <div>
              <h3>
                Tests asignados
              </h3>

              <p>
                Seleccioná las
                evaluaciones
                disponibles para este
                paciente.
              </p>
            </div>

            <span
              className={
                styles.testCounter
              }
            >
              {
                testsSeleccionados.length
              }{" "}
              de{" "}
              {
                TESTS_DISPONIBLES.length
              }{" "}
              seleccionados
            </span>
          </div>

          <div
            className={
              styles.testsGrid
            }
          >
            {TESTS_DISPONIBLES.map(
              (test) => {
                const selected =
                  testsSeleccionados.includes(
                    test.id,
                  );

                return (
                  <button
                    type="button"
                    key={test.id}
                    className={`${styles.testCard} ${
                      selected
                        ? styles.testCardSelected
                        : ""
                    }`}
                    onClick={() =>
                      toggleTest(
                        test.id,
                      )
                    }
                    disabled={
                      guardando
                    }
                    aria-pressed={
                      selected
                    }
                  >
                    <div
                      className={
                        styles.testCardTop
                      }
                    >
                      <strong>
                        {test.nombre}
                      </strong>

                      <span
                        className={`${styles.checkCircle} ${
                          selected
                            ? styles.checkCircleSelected
                            : ""
                        }`}
                      >
                        {selected
                          ? "✓"
                          : ""}
                      </span>
                    </div>

                    <span
                      className={
                        styles.testDescription
                      }
                    >
                      {
                        test.descripcion
                      }
                    </span>
                  </button>
                );
              },
            )}
          </div>
        </section>

        {/* ===============================================
            FOOTER
        =============================================== */}

        <footer
          className={
            styles.modalFooter
          }
        >
          <p
            className={
              styles.footerHint
            }
          >
            Los cambios se aplicarán
            inmediatamente al perfil.
          </p>

          <div
            className={
              styles.modalButtons
            }
          >
            <BotonPersonalizado
              variant="secondary"
              onClick={onCerrar}
              disabled={
                guardando
              }
            >
              Cancelar
            </BotonPersonalizado>

            <BotonPersonalizado
              variant="primary"
              onClick={
                manejarGuardar
              }
              disabled={
                guardando ||
                !fechaIngreso
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