import { useEffect, useState } from "react";

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
   COMPONENTE
========================================================= */

export default function EditarPacienteModal({
  abierto,
  onCerrar,
  onGuardar,
  paciente,
  asignacionesActuales = [],
}: Props) {
  const [activo, setActivo] = useState(true);
  const [fechaFin, setFechaFin] = useState("");
  const [testsSeleccionados, setTestsSeleccionados] =
    useState<string[]>([]);

  const [guardando, setGuardando] = useState(false);

  /* =======================================================
     CARGAR DATOS
  ======================================================= */

  useEffect(() => {
    if (!abierto || !paciente) return;

    setActivo(paciente.activo);
    setTestsSeleccionados(asignacionesActuales);

    if (paciente.fechaFinAcceso) {
      const date = paciente.fechaFinAcceso.toDate
        ? paciente.fechaFinAcceso.toDate()
        : new Date(paciente.fechaFinAcceso);

      const year = date.getFullYear();

      const month = String(
        date.getMonth() + 1,
      ).padStart(2, "0");

      const day = String(
        date.getDate(),
      ).padStart(2, "0");

      setFechaFin(
        `${year}-${month}-${day}`,
      );
    } else {
      setFechaFin("");
    }
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

    try {
      const previoActivo = paciente.activo;

      if (!previoActivo && activo) {
        const ahora = new Date();

        const fin = new Date(
          ahora.getTime() +
            24 * 60 * 60 * 1000,
        );

        const year = fin.getFullYear();

        const month = String(
          fin.getMonth() + 1,
        ).padStart(2, "0");

        const day = String(
          fin.getDate(),
        ).padStart(2, "0");

        setFechaFin(
          `${year}-${month}-${day}`,
        );
      }
    } catch {
      // No hacemos nada.
    }
  }, [activo, abierto, paciente]);

  /* =======================================================
     TOGGLE TEST
  ======================================================= */

  const toggleTest = (
    testId: string,
  ) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter(
            (test) => test !== testId,
          )
        : [...prev, testId],
    );
  };

  /* =======================================================
     FECHA MÍNIMA
  ======================================================= */

  const obtenerFechaMinima = () => {
    if (!paciente?.fechaInicioAcceso) {
      return undefined;
    }

    const inicio =
      paciente.fechaInicioAcceso.toDate
        ? paciente.fechaInicioAcceso.toDate()
        : new Date(
            paciente.fechaInicioAcceso,
          );

    return new Date(
      inicio.getTime(),
    )
      .toISOString()
      .slice(0, 10);
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

      if (!fechaFin) {
        alert(
          "Seleccioná una fecha límite de acceso.",
        );

        return;
      }

      try {
        setGuardando(true);

        const dateObj = new Date(
          fechaFin.replace(/-/g, "/"),
        );

        const inicio =
          paciente?.fechaInicioAcceso
            ?.toDate
            ? paciente.fechaInicioAcceso.toDate()
            : new Date(
                paciente?.fechaInicioAcceso,
              );

        if (
          inicio instanceof Date &&
          !Number.isNaN(
            inicio.getTime(),
          )
        ) {
          const maxFin = new Date(
            inicio.getTime() +
              24 * 60 * 60 * 1000,
          );

          if (
            dateObj.getTime() >
            maxFin.getTime()
          ) {
            alert(
              "La fecha de fin no puede superar las 24 horas desde la fecha de inicio.",
            );

            return;
          }
        }

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
            fechaFinAcceso: dateObj,
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

        onGuardar({
          activo,

          fechaFinAcceso:
            dateObj,

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

            {/* FECHA */}

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
                    Fecha límite
                  </span>

                  <strong>
                    Vencimiento del
                    acceso
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
                  value={fechaFin}
                  onChange={(event) =>
                    setFechaFin(
                      event.target
                        .value,
                    )
                  }
                  min={obtenerFechaMinima()}
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
                El acceso no puede
                superar las 24 horas
                desde la fecha de
                inicio.
              </p>
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
                guardando
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