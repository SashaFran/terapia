import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import styles from "./NuevaSesion.module.css";

import { db } from "../../firebase/firebase";

import {
  crearSesion,
  mensajeErrorSesion,
} from "../../firebase/sesiones";

import BotonPersonalizado from "../../components/Boton/Boton";
import LoadingState from "../../components/Loading/LoadingState";

interface Paciente {
  id: string;
  nombre: string;
}

const TESTS = [
  {
    id: "k10",
    nombre: "K-10",
    descripcion: "Malestar psicológico",
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
    descripcion: "Inteligencia no verbal",
  },
];

export default function NuevaSesion({
  onClose,
  onPacienteCreado,
}: any) {
  const navigate = useNavigate();

  const cerrar =
    onClose ??
    (() =>
      navigate("/admin/sesiones"));

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [pacientes, setPacientes] =
    useState<Paciente[]>([]);

  const [formData, setFormData] =
    useState({
      pacienteId: "",
      fecha: "",
      testId: TESTS[0].id,
      observaciones: "",
    });

  /* =======================================================
     CARGAR PACIENTES
  ======================================================= */

  useEffect(() => {
    void cargarPacientes();
  }, []);

  const cargarPacientes =
    async () => {
      try {
        const snap =
          await getDocs(
            collection(
              db,
              "pacientes",
            ),
          );

        const data =
          snap.docs.map(
            (documento) => ({
              id: documento.id,

              nombre:
                documento.data()
                  .nombre ||
                "Sin nombre",
            }),
          );

        setPacientes(data);
      } catch (error) {
        console.error(
          "Error cargando pacientes:",
          error,
        );
      } finally {
        setLoading(false);
      }
    };

  /* =======================================================
     CAMBIOS DEL FORM
  ======================================================= */

  const handleChange = (
    e: React.ChangeEvent<
      | HTMLInputElement
      | HTMLSelectElement
      | HTMLTextAreaElement
    >,
  ) => {
    const { id, value } =
      e.target;

    setFormData((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const seleccionarTest = (
    testId: string,
  ) => {
    setFormData((prev) => ({
      ...prev,
      testId,
    }));
  };

  /* =======================================================
     CREAR SESIÓN
  ======================================================= */

  const handleSubmit = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (saving) return;

    if (!formData.pacienteId) {
      alert(
        "Seleccioná un paciente",
      );
      return;
    }

    if (!formData.fecha) {
      alert(
        "Seleccioná una fecha de evaluación",
      );
      return;
    }

    if (!formData.testId) {
      alert("Seleccioná un test");
      return;
    }

    setSaving(true);

    try {
      const { data } =
        await crearSesion({
          pacienteId:
            formData.pacienteId,

          fecha: formData.fecha,

          testId:
            formData.testId,

          observaciones:
            formData.observaciones,
        });

      onPacienteCreado?.();

      navigate(
        `/test/${data.testId}?sesion=${data.sesionId}&paciente=${data.pacienteId}`,
      );
    } catch (error) {
      console.error(
        "Error creando sesión:",
        error,
      );

      alert(
        mensajeErrorSesion(error),
      );
    } finally {
      setSaving(false);
    }
  };

  /* =======================================================
     DATOS DERIVADOS
  ======================================================= */

  const pacienteSeleccionado =
    pacientes.find(
      (paciente) =>
        paciente.id ===
        formData.pacienteId,
    );

  const testSeleccionado =
    TESTS.find(
      (test) =>
        test.id ===
        formData.testId,
    );

  /* =======================================================
     LOADING
  ======================================================= */

  if (loading) {
    return <LoadingState message="Cargando pacientes..." />;
  }

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <form
      className={styles.form}
      onSubmit={handleSubmit}
    >
      {/* ===============================================
          DATOS DE LA SESIÓN
      =============================================== */}

      <section
        className={styles.section}
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <h3>
              Datos de la sesión
            </h3>

            <p>
              Seleccioná el paciente
              y la fecha de la
              evaluación.
            </p>
          </div>

          <span
            className={
              styles.sessionBadge
            }
          >
            Nueva evaluación
          </span>
        </div>

        <div
          className={
            styles.fieldsGrid
          }
        >
          {/* PACIENTE */}

          <div
            className={
              styles.fieldCard
            }
          >
            <div
              className={
                styles.labelRow
              }
            >
              <label htmlFor="pacienteId">
                Paciente
              </label>

              {pacienteSeleccionado && (
                <span
                  className={
                    styles.selectedBadge
                  }
                >
                  Seleccionado
                </span>
              )}
            </div>

            <select
              id="pacienteId"
              value={
                formData.pacienteId
              }
              onChange={
                handleChange
              }
              required
              disabled={saving}
            >
              <option
                value=""
                disabled
              >
                Seleccionar paciente
              </option>

              {pacientes.map(
                (paciente) => (
                  <option
                    key={
                      paciente.id
                    }
                    value={
                      paciente.id
                    }
                  >
                    {
                      paciente.nombre
                    }
                  </option>
                ),
              )}
            </select>

            <span
              className={
                styles.fieldHelp
              }
            >
              {pacienteSeleccionado
                ? `La evaluación quedará asociada a ${pacienteSeleccionado.nombre}.`
                : "Elegí el paciente que realizará la evaluación."}
            </span>
          </div>

          {/* FECHA */}

          <div
            className={
              styles.fieldCard
            }
          >
            <label htmlFor="fecha">
              Fecha de evaluación
            </label>

            <input
              type="date"
              id="fecha"
              value={formData.fecha}
              onChange={
                handleChange
              }
              required
              disabled={saving}
            />

            <span
              className={
                styles.fieldHelp
              }
            >
              Fecha en la que se
              registra esta sesión.
            </span>
          </div>
        </div>
      </section>

      {/* ===============================================
          TEST
      =============================================== */}

      <section
        className={styles.section}
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <h3>
              Test a aplicar
            </h3>

            <p>
              Elegí la evaluación que
              se realizará en esta
              sesión.
            </p>
          </div>

          {testSeleccionado && (
            <span
              className={
                styles.testCounter
              }
            >
              1 seleccionado
            </span>
          )}
        </div>

        <div
          className={
            styles.testsGrid
          }
        >
          {TESTS.map((test) => {
            const selected =
              formData.testId ===
              test.id;

            return (
              <button
                key={test.id}
                type="button"
                className={`${styles.testCard} ${
                  selected
                    ? styles.testCardSelected
                    : ""
                }`}
                onClick={() =>
                  seleccionarTest(
                    test.id,
                  )
                }
                disabled={saving}
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
                    className={`${styles.radioCircle} ${
                      selected
                        ? styles.radioCircleSelected
                        : ""
                    }`}
                  >
                    {selected && (
                      <span />
                    )}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ===============================================
          OBSERVACIONES
      =============================================== */}

      <section
        className={styles.section}
      >
        <div
          className={
            styles.sectionHeader
          }
        >
          <div>
            <h3>
              Observaciones iniciales
            </h3>

            <p>
              Podés dejar información
              previa que resulte útil
              para la evaluación.
            </p>
          </div>

          <span
            className={
              styles.optionalBadge
            }
          >
            Opcional
          </span>
        </div>

        <div
          className={
            styles.observationsCard
          }
        >
          <textarea
            id="observaciones"
            placeholder="Escribí notas previas a la evaluación..."
            value={
              formData.observaciones
            }
            onChange={
              handleChange
            }
            disabled={saving}
            rows={3}
          />

          <div
            className={
              styles.characterCount
            }
          >
            {
              formData
                .observaciones
                .length
            }{" "}
            caracteres
          </div>
        </div>
      </section>

      {/* ===============================================
          FOOTER
      =============================================== */}

      <footer
        className={
          styles.formFooter
        }
      >
        <div
          className={
            styles.footerInfo
          }
        >
          <span
            className={
              styles.footerDot
            }
          />

          <p>
            Al continuar se creará la
            sesión y comenzará la
            evaluación seleccionada.
          </p>
        </div>

        <div
          className={
            styles.actions
          }
        >
          <BotonPersonalizado
            variant="secondary"
            onClick={() => {
              if (
                confirm(
                  "¿Cancelar la creación de la sesión?",
                )
              ) {
                cerrar();
              }
            }}
            disabled={saving}
          >
            Cancelar
          </BotonPersonalizado>

          <BotonPersonalizado
            variant="primary"
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Creando sesión..."
              : "Comenzar evaluación"}
          </BotonPersonalizado>
        </div>
      </footer>
    </form>
  );
}