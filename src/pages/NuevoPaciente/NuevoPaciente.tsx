import { useState } from "react";
import { useNavigate } from "react-router-dom";

import {
  crearPaciente,
  mensajeErrorPaciente,
} from "../../firebase/pacientes";

import styles from "./NuevoPaciente.module.css";

import BotonPersonalizado from "../../components/Boton/Boton";

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

export default function NuevoPaciente({
  onClose,
  onPacienteCreado,
}: any) {
  const navigate = useNavigate();

  const cerrar =
    onClose ??
    (() => navigate("/admin/pacientes"));

  const [formData, setFormData] = useState({
    nombre: "",
    dni: "",
    contacto: "",
    fechaIngreso: "",
  });

  const [
    testsSeleccionados,
    setTestsSeleccionados,
  ] = useState<string[]>([]);

  const [loading, setLoading] =
    useState(false);

  /* =======================================================
     FORMULARIO
  ======================================================= */

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = e.target;

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const toggleTest = (testId: string) => {
    setTestsSeleccionados((prev) =>
      prev.includes(testId)
        ? prev.filter(
            (test) => test !== testId,
          )
        : [...prev, testId],
    );
  };

  /* =======================================================
     GUARDAR
  ======================================================= */

  const guardarPaciente = async (
    e: React.FormEvent,
  ) => {
    e.preventDefault();

    if (loading) return;

    setLoading(true);

    try {
      const dniLimpio = formData.dni
        .trim()
        .replace(/\D/g, "");

      if (
        dniLimpio.length < 6 ||
        dniLimpio.length > 12
      ) {
        alert(
          "El DNI debe tener entre 6 y 12 números",
        );

        return;
      }

      if (!formData.contacto.trim()) {
        alert(
          "Ingresá el email del paciente",
        );

        return;
      }

      if (
        testsSeleccionados.length === 0
      ) {
        alert(
          "Asigná al menos un test.",
        );

        return;
      }

      if (!formData.fechaIngreso) {
        alert(
          "Seleccioná una fecha de ingreso",
        );

        return;
      }

      const fechaInicio = new Date(
        `${formData.fechaIngreso}T00:00:00`,
      );

      const hoyArgentina = new Date(
        new Date().toLocaleString(
          "en-US",
          {
            timeZone:
              "America/Argentina/Buenos_Aires",
          },
        ),
      );

      hoyArgentina.setHours(
        0,
        0,
        0,
        0,
      );

      if (
        fechaInicio < hoyArgentina
      ) {
        alert(
          "La fecha no puede ser anterior a hoy (hora de Argentina)",
        );

        return;
      }

      const { data } =
        await crearPaciente({
          ...formData,

          contacto:
            formData.contacto
              .trim()
              .toLowerCase(),

          dni: dniLimpio,

          testsSeleccionados,
        });

      if (data.emailEnviado) {
        alert(
          `Paciente creado correctamente.

DNI: ${data.dni}
Clave: ${data.password}

✓ Las credenciales y los datos de acceso fueron enviados a:
${data.email}`,
        );
      } else {
        alert(
          `Paciente creado correctamente.

DNI: ${data.dni}
Clave: ${data.password}

⚠️ El paciente fue creado, pero no se pudo enviar el email a:
${data.email}

Guardá las credenciales para entregárselas manualmente.`,
        );
      }

      onPacienteCreado?.();

      cerrar();
    } catch (error: any) {
      console.error(error);

      alert(
        mensajeErrorPaciente(
          error,
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  /* =======================================================
     DATOS DERIVADOS
  ======================================================= */

  const dniLimpio =
    formData.dni.replace(
      /\D/g,
      "",
    );

  const passwordPreview =
    dniLimpio.length >= 6
      ? dniLimpio.slice(-6)
      : null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <form
      className={styles.form}
      onSubmit={guardarPaciente}
    >
      {/* ===============================================
          DATOS DEL PACIENTE
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
              Datos del paciente
            </h3>

            <p>
              Completá la información
              necesaria para crear su
              acceso.
            </p>
          </div>

          <span
            className={
              styles.accessBadge
            }
          >
            Acceso por 24 h
          </span>
        </div>

        <div
          className={
            styles.fieldsGrid
          }
        >
          {/* NOMBRE */}

          <div
            className={
              styles.fieldCard
            }
          >
            <label htmlFor="nombre">
              Nombre completo
            </label>

            <input
              type="text"
              name="nombre"
              id="nombre"
              placeholder="Ej. Sasha Franchini"
              value={
                formData.nombre
              }
              onChange={
                handleChange
              }
              required
              disabled={loading}
            />

            <span
              className={
                styles.fieldHelp
              }
            >
              Nombre y apellido del
              paciente.
            </span>
          </div>

          {/* DNI */}

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
              <label htmlFor="dni">
                DNI
              </label>

              {passwordPreview && (
                <span
                  className={
                    styles.passwordBadge
                  }
                >
                  Clave:{" "}
                  {passwordPreview}
                </span>
              )}
            </div>

            <input
              type="text"
              name="dni"
              id="dni"
              inputMode="numeric"
              placeholder="Ej. 40123456"
              value={formData.dni}
              onChange={
                handleChange
              }
              required
              disabled={loading}
            />

            <span
              className={
                styles.fieldHelp
              }
            >
              Se utilizará para el
              acceso del paciente.
            </span>
          </div>

          {/* EMAIL */}

          <div
            className={
              styles.fieldCard
            }
          >
            <label htmlFor="contacto">
              Email
            </label>

            <input
              type="email"
              name="contacto"
              id="contacto"
              placeholder="paciente@email.com"
              value={
                formData.contacto
              }
              onChange={
                handleChange
              }
              required
              disabled={loading}
            />

            <span
              className={
                styles.fieldHelp
              }
            >
              Recibirá las
              credenciales y los
              datos de acceso.
            </span>
          </div>

          {/* FECHA */}

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
              <label
                htmlFor="fechaIngreso"
              >
                Fecha de acceso
              </label>

              <span
                className={
                  styles.durationBadge
                }
              >
                24h
              </span>
            </div>

            <input
              type="date"
              name="fechaIngreso"
              id="fechaIngreso"
              value={
                formData.fechaIngreso
              }
              onChange={
                handleChange
              }
              required
              disabled={loading}
            />

            <span
              className={
                styles.fieldHelp
              }
            >
              El acceso comenzará a
              las 00:00 de la fecha
              seleccionada.
            </span>
          </div>
        </div>
      </section>

      {/* ===============================================
          TESTS
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
              Tests asignados
            </h3>

            <p>
              Seleccioná las
              evaluaciones que tendrá
              disponibles el
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
                  key={test.id}
                  type="button"
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
                  disabled={loading}
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
          styles.formFooter
        }
      >
        <p
          className={
            styles.footerHint
          }
        >
          Al crear el paciente se
          generarán sus credenciales
          y se intentarán enviar por
          email.
        </p>

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
                  "¿Cancelar la creación del paciente?",
                )
              ) {
                cerrar();
              }
            }}
            disabled={loading}
          >
            Cancelar
          </BotonPersonalizado>

          <BotonPersonalizado
            type="submit"
            variant="primary"
            disabled={loading}
            tooltip="Registrar al paciente con los tests seleccionados."
          >
            {loading
              ? "Creando..."
              : "Crear paciente"}
          </BotonPersonalizado>
        </div>
      </footer>
    </form>
  );
}