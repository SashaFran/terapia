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
    nombre: "Escala K10",
  },
  {
    id: "bfq",
    nombre: "Personalidad BFQ",
  },
  {
    id: "zulliger",
    nombre: "Láminas Zulliger",
  },
  {
    id: "bender",
    nombre: "Test de Bender",
  },
  {
    id: "raven",
    nombre: "Raven Abreviado",
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

      if (testsSeleccionados.length === 0) {
        alert(
          "Asigná al menos un test 🧠",
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

      if (fechaInicio < hoyArgentina) {
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
        mensajeErrorPaciente(error),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className={styles.nav}>
      </div>

      <form
        className={styles.form}
        onSubmit={guardarPaciente}
      >
        <div
          className={styles.inputGroup}
        >
          <div className="container">
            <div
              className={
                styles.container
              }
            >
              <label
                htmlFor="nombre"
                className="paddingHorizontal"
              >
                Nombre completo:{" "}
              </label>

              <input
                type="text"
                name="nombre"
                id="nombre"
                placeholder="Nombre completo"
                value={formData.nombre}
                onChange={handleChange}
                required
              />
            </div>

            <div
              className={
                styles.container
              }
            >
              <label
                htmlFor="dni"
                className="paddingHorizontal"
              >
                DNI:{" "}
              </label>

              <div className="row">
                <input
                  type="text"
                  name="dni"
                  id="dni"
                  placeholder="DNI"
                  value={formData.dni}
                  onChange={handleChange}
                  required
                />

                {formData.dni
                  .replace(/\D/g, "")
                  .length >= 6 && (
                  <small>
                    🔑 Contraseña:{" "}
                    <strong>
                      {formData.dni
                        .replace(
                          /\D/g,
                          "",
                        )
                        .slice(-6)}
                    </strong>
                  </small>
                )}
              </div>
            </div>

            <div
              className={
                styles.container
              }
            >
              <label
                htmlFor="contacto"
                className="paddingHorizontal"
              >
                Email:{" "}
              </label>

              <input
                type="email"
                name="contacto"
                id="contacto"
                placeholder="paciente@email.com"
                value={
                  formData.contacto
                }
                onChange={handleChange}
                required
              />
            </div>

            <div
              className={
                styles.container
              }
            >
              <label
                htmlFor="fechaIngreso"
                className="paddingHorizontal"
              >
                Fecha de acceso:{" "}
              </label>

              <input
                type="date"
                name="fechaIngreso"
                id="fechaIngreso"
                value={
                  formData.fechaIngreso
                }
                onChange={handleChange}
                required
              />

              {formData.fechaIngreso && (
                <small>
                  El acceso se habilitará
                  en esta fecha y tendrá
                  una vigencia de 24 horas.
                </small>
              )}
            </div>
          </div>
        </div>

        <div
          className={styles.inputGroup}
        >
          <h2>
            Asignación de Tests
          </h2>

          <div
            className={
              styles.testsCheckboxes
            }
          >
            {TESTS_DISPONIBLES.map(
              (test) => (
                <label key={test.id}>
                  <input
                    type="checkbox"
                    checked={testsSeleccionados.includes(
                      test.id,
                    )}
                    onChange={() =>
                      toggleTest(
                        test.id,
                      )
                    }
                  />

                  {test.nombre}
                </label>
              ),
            )}
          </div>
        </div>

        <div className="nav">
          <BotonPersonalizado
            variant="danger"
            onClick={() => {
              if (
                confirm(
                  "¿Cancelar?",
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
            disabled={loading}
            tooltip="Registrar al paciente con todos los tests seleccionados."
          >
            {loading
              ? "Creando..."
              : "Crear paciente"}
          </BotonPersonalizado>
        </div>
      </form>
    </div>
  );
}