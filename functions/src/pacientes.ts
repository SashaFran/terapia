import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";
import { Resend } from "resend";

const testsDisponibles = new Set([
  "k10",
  "bfq",
  "zulliger",
  "bender",
  "raven",
]);

const nombresTests: Record<string, string> = {
  k10: "Escala K10",
  bfq: "Personalidad BFQ",
  zulliger: "Láminas Zulliger",
  bender: "Test de Bender",
  raven: "Raven Abreviado",
};

const bloqueos = new Set<string>();

function normalizarDni(valor: unknown) {
  return String(valor ?? "").replace(/\D/g, "");
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarAlta(data: Record<string, unknown>) {
  const nombre =
    typeof data.nombre === "string"
      ? data.nombre.trim()
      : "";

  const dni = normalizarDni(data.dni);

  const contacto =
    typeof data.contacto === "string"
      ? data.contacto.trim().toLowerCase()
      : "";

  const fechaIngreso =
    typeof data.fechaIngreso === "string"
      ? data.fechaIngreso
      : "";

  const tests = Array.isArray(data.testsSeleccionados)
    ? data.testsSeleccionados.filter(
        (test): test is string =>
          typeof test === "string" &&
          testsDisponibles.has(test),
      )
    : [];

  if (!nombre) {
    throw new HttpsError(
      "invalid-argument",
      "Ingrese el nombre del paciente.",
    );
  }

  if (dni.length < 6 || dni.length > 12) {
    throw new HttpsError(
      "invalid-argument",
      "El DNI debe tener entre 6 y 12 números.",
    );
  }

  if (!contacto || !validarEmail(contacto)) {
    throw new HttpsError(
      "invalid-argument",
      "Ingrese un email válido.",
    );
  }

  if (!fechaIngreso) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione una fecha de acceso.",
    );
  }

  if (tests.length === 0) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione al menos un test.",
    );
  }

  const inicio = new Date(
    `${fechaIngreso}T00:00:00-03:00`,
  );

  if (!Number.isFinite(inicio.getTime())) {
    throw new HttpsError(
      "invalid-argument",
      "La fecha de acceso no es válida.",
    );
  }

  return {
    nombre,
    dni,
    contacto,
    inicio,
    tests,
  };
}

async function conBloqueo<T>(
  dni: string,
  operacion: () => Promise<T>,
): Promise<T> {
  if (bloqueos.has(dni)) {
    throw new HttpsError(
      "aborted",
      "Ya se está procesando este paciente.",
    );
  }

  bloqueos.add(dni);

  try {
    return await operacion();
  } finally {
    bloqueos.delete(dni);
  }
}

function formatearFechaArgentina(fecha: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(fecha);
}

async function enviarEmailAcceso({
  nombre,
  email,
  dni,
  password,
  tests,
  inicio,
}: {
  nombre: string;
  email: string;
  dni: string;
  password: string;
  tests: string[];
  inicio: Date;
}) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurada.",
    );
  }

  const resend = new Resend(apiKey);

  const fechaAcceso = formatearFechaArgentina(inicio);

  const listaTests = tests
    .map(
      (testId) =>
        `<li style="margin-bottom: 8px;">
          ${nombresTests[testId] ?? testId}
        </li>`,
    )
    .join("");

  const { error } = await resend.emails.send({
    /*
     * IMPORTANTE:
     * cuando verifiques joinsolution.com.ar en Resend,
     * podés usar este remitente.
     */
    from: "Join Solution <acceso@joinsolution.com.ar>",

    to: [email],

    subject: "Acceso a evaluaciones - Join Solution",

    html: `
      <!DOCTYPE html>
      <html lang="es">
        <head>
          <meta charset="UTF-8" />
        </head>

        <body
          style="
            margin: 0;
            padding: 0;
            background-color: #f5f5f5;
            font-family: Arial, Helvetica, sans-serif;
            color: #222222;
          "
        >
          <div
            style="
              max-width: 600px;
              margin: 30px auto;
              background-color: #ffffff;
              border-radius: 12px;
              overflow: hidden;
            "
          >
            <div
              style="
                padding: 28px;
                background-color: #ffb000;
              "
            >
              <h1
                style="
                  margin: 0;
                  font-size: 26px;
                  color: #ffffff;
                "
              >
                Join Solution
              </h1>
            </div>

            <div style="padding: 32px;">
              <h2
                style="
                  margin-top: 0;
                  color: #222222;
                "
              >
                Acceso a evaluaciones
              </h2>

              <p>Hola ${nombre},</p>

              <p>
                Se ha habilitado tu acceso a la plataforma
                de evaluaciones de Join Solution.
              </p>

              <div
                style="
                  margin: 24px 0;
                  padding: 20px;
                  background-color: #f7f7f7;
                  border-radius: 8px;
                "
              >
                <p style="margin: 0 0 10px;">
                  <strong>Usuario:</strong> ${dni}
                </p>

                <p style="margin: 0;">
                  <strong>Contraseña:</strong> ${password}
                </p>
              </div>

              <h3>Evaluaciones asignadas</h3>

              <ul>
                ${listaTests}
              </ul>

              <div
                style="
                  margin: 24px 0;
                  padding: 18px;
                  border-left: 4px solid #ff8800;
                  background-color: #fff8e8;
                "
              >
                <strong>
                  Tu acceso estará habilitado a partir del
                  ${fechaAcceso}.
                </strong>

                <p style="margin-bottom: 0;">
                  Desde el momento de habilitación,
                  dispondrás de 24 horas para ingresar a la
                  plataforma y completar las evaluaciones
                  asignadas.
                </p>
              </div>

              <p>
                Te recomendamos realizar las evaluaciones
                en un entorno tranquilo y disponer del
                tiempo necesario para completarlas sin
                interrupciones.
              </p>

              <div
                style="
                  text-align: center;
                  margin: 30px 0;
                "
              >
                <a
                  href="https://joinsolution.com.ar"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    background-color: #ff8800;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-weight: bold;
                  "
                >
                  Ingresar a Join Solution
                </a>
              </div>

              <p
                style="
                  margin-top: 30px;
                  font-size: 13px;
                  color: #666666;
                "
              >
                Si tenés alguna dificultad para acceder,
                comunicate con el equipo de Join Solution.
              </p>
            </div>
          </div>
        </body>
      </html>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function crearPaciente(
  data: Record<string, unknown>,
) {
  const {
    dni,
    nombre,
    tests,
    inicio,
    contacto,
  } = validarAlta(data);

  return conBloqueo(dni, async () => {
    const db = admin.firestore();

    const pacientes = db.collection("pacientes");

    /*
     * Evitamos pacientes duplicados por DNI.
     */
    const existente = await pacientes
      .where("dni", "==", dni)
      .limit(1)
      .get();

    if (!existente.empty) {
      throw new HttpsError(
        "already-exists",
        "Ya existe un paciente registrado con ese DNI.",
      );
    }

    /*
     * Firebase Auth usa un email interno porque
     * el paciente inicia sesión mediante DNI.
     */
    const emailAuth = `${dni}@paciente.com`;

    const password = dni.slice(-6);

    let user: admin.auth.UserRecord;

    try {
      user = await admin.auth().createUser({
        email: emailAuth,
        password,
      });
    } catch (error: any) {
      if (error?.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "Ya existe una cuenta asociada a ese DNI.",
        );
      }

      throw error;
    }

    const paciente = pacientes.doc();

    const batch = db.batch();

    batch.set(paciente, {
      uid: user.uid,
      nombre,
      dni,
      password,
      contacto,
      activo: true,

      fechaInicioAcceso:
        admin.firestore.Timestamp.fromDate(inicio),

      fechaFinAcceso:
        admin.firestore.Timestamp.fromMillis(
          inicio.getTime() + 24 * 60 * 60 * 1000,
        ),

      createdAt:
        admin.firestore.FieldValue.serverTimestamp(),
    });

    for (const testId of tests) {
      const asignacion =
        db.collection("asignaciones").doc();

      batch.set(asignacion, {
        pacienteId: paciente.id,
        testId,
        estado: "pendiente",

        fechaAsignacion:
          admin.firestore.Timestamp.fromDate(inicio),

        fechaCompletado: null,
      });
    }

    try {
      await batch.commit();
    } catch (error) {
      /*
       * Si Firestore falla después de crear Auth,
       * eliminamos la cuenta para no dejar un
       * usuario huérfano.
       */
      await admin.auth().deleteUser(user.uid).catch(() => {
        // No reemplazamos el error original.
      });

      throw error;
    }

    /*
     * El paciente ya está creado.
     *
     * Por eso, si Resend falla, NO hacemos rollback.
     * Simplemente informamos al frontend.
     */
    let emailEnviado = false;

    try {
      await enviarEmailAcceso({
        nombre,
        email: contacto,
        dni,
        password,
        tests,
        inicio,
      });

      emailEnviado = true;
    } catch (error) {
      console.error(
        "Paciente creado, pero falló el envío del email:",
        error,
      );
    }

    return {
      pacienteId: paciente.id,
      uid: user.uid,
      dni,
      password,
      email: contacto,
      emailEnviado,
    };
  });
}

export async function eliminarPaciente(
  pacienteId: string,
  uidSolicitante: string,
) {
  if (!pacienteId) {
    throw new HttpsError(
      "invalid-argument",
      "Paciente inválido.",
    );
  }

  const db = admin.firestore();

  const pacienteRef =
    db.collection("pacientes").doc(pacienteId);

  const pacienteSnap = await pacienteRef.get();

  if (!pacienteSnap.exists) {
    throw new HttpsError(
      "not-found",
      "El paciente no existe.",
    );
  }

  const pacienteData = pacienteSnap.data();

  const uidPaciente = pacienteData?.uid;

  if (
    typeof uidPaciente === "string" &&
    uidPaciente === uidSolicitante
  ) {
    throw new HttpsError(
      "failed-precondition",
      "No puede eliminar su propia cuenta desde esta operación.",
    );
  }

  /*
   * Borramos documentos relacionados.
   */
  const asignaciones = await db
    .collection("asignaciones")
    .where("pacienteId", "==", pacienteId)
    .get();

  const sesiones = await db
    .collection("sesiones")
    .where("pacienteId", "==", pacienteId)
    .get();

  const resultados = await db
    .collection("resultados")
    .where("pacienteId", "==", pacienteId)
    .get();

  const batch = db.batch();

  asignaciones.docs.forEach((documento) => {
    batch.delete(documento.ref);
  });

  sesiones.docs.forEach((documento) => {
    batch.delete(documento.ref);
  });

  resultados.docs.forEach((documento) => {
    batch.delete(documento.ref);
  });

  batch.delete(pacienteRef);

  await batch.commit();

  if (typeof uidPaciente === "string") {
    try {
      await admin.auth().deleteUser(uidPaciente);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        console.error(
          "Error eliminando usuario de Auth:",
          error,
        );
      }
    }
  }

  return {
    eliminado: true,
  };
}