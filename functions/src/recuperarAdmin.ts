import * as admin from "firebase-admin";
import { Resend } from "resend";

/* =========================================================
   CONFIGURACIÓN
========================================================= */

const LOGIN_ADMIN_URL =
  "https://joinsolution.com.ar/admin/login";

/* =========================================================
   HELPERS
========================================================= */

function normalizarEmail(valor: unknown) {
  return typeof valor === "string"
    ? valor.trim().toLowerCase()
    : "";
}

function validarEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/* =========================================================
   EMAIL
========================================================= */

async function enviarEmailRecuperacion(
  email: string,
  resetLink: string,
) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error(
      "RESEND_API_KEY no está configurada.",
    );
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from: "Join Solution <acceso@joinsolution.com.ar>",

    to: [email],

    subject:
      "Recuperación de acceso administrativo - Join Solution",

    html: `
      <!DOCTYPE html>

      <html lang="es">
        <head>
          <meta charset="UTF-8" />
          <meta
            name="viewport"
            content="width=device-width, initial-scale=1.0"
          />
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
              border: 1px solid #eeeeee;
            "
          >
            <!-- HEADER -->

            <div
              style="
                height: 4px;
                background: linear-gradient(
                  90deg,
                  #ffb000,
                  #ff8800,
                  #ff4438
                );
              "
            ></div>

            <div
              style="
                padding: 32px 32px 12px;
              "
            >
              <p
                style="
                  margin: 0 0 8px;
                  color: #ff7900;
                  font-size: 11px;
                  font-weight: bold;
                  letter-spacing: 1.5px;
                  text-transform: uppercase;
                "
              >
                JOIN SOLUTION
              </p>

              <h1
                style="
                  margin: 0;
                  color: #342e2a;
                  font-size: 24px;
                  font-weight: 600;
                "
              >
                Recuperación de acceso
              </h1>
            </div>

            <!-- CONTENT -->

            <div
              style="
                padding: 12px 32px 32px;
              "
            >
              <p
                style="
                  margin: 0 0 18px;
                  color: #555555;
                  font-size: 15px;
                  line-height: 1.6;
                "
              >
                Recibimos una solicitud para cambiar la
                contraseña de tu cuenta administrativa de
                Join Solution.
              </p>

              <p
                style="
                  margin: 0 0 24px;
                  color: #555555;
                  font-size: 15px;
                  line-height: 1.6;
                "
              >
                Para establecer una nueva contraseña,
                utilizá el siguiente enlace:
              </p>

              <!-- BUTTON -->

              <div
                style="
                  margin: 28px 0;
                  text-align: center;
                "
              >
                <a
                  href="${resetLink}"
                  style="
                    display: inline-block;
                    padding: 14px 24px;
                    background-color: #ff8800;
                    color: #ffffff;
                    text-decoration: none;
                    border-radius: 8px;
                    font-size: 14px;
                    font-weight: bold;
                  "
                >
                  Crear nueva contraseña
                </a>
              </div>

              <!-- SECURITY INFO -->

              <div
                style="
                  margin: 26px 0;
                  padding: 18px;
                  background-color: #fffaf3;
                  border-left: 4px solid #ff8800;
                  border-radius: 4px;
                "
              >
                <p
                  style="
                    margin: 0;
                    color: #66594d;
                    font-size: 13px;
                    line-height: 1.6;
                  "
                >
                  Si no solicitaste este cambio,
                  podés ignorar este correo.
                  Tu contraseña actual seguirá funcionando
                  mientras no completes el proceso.
                </p>
              </div>

              <p
                style="
                  margin: 28px 0 0;
                  color: #999999;
                  font-size: 12px;
                  line-height: 1.5;
                "
              >
                Este mensaje fue enviado automáticamente
                por Join Solution. No compartas este enlace
                con otras personas.
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

/* =========================================================
   RECUPERACIÓN DE ADMIN
========================================================= */

export async function recuperarAccesoAdmin(
  data: Record<string, unknown>,
) {
  const email = normalizarEmail(data.email);

  /*
   * IMPORTANTE:
   *
   * Siempre devolvemos una respuesta neutra.
   * El frontend nunca debe saber si el email existe,
   * si pertenece a un admin o si no está registrado.
   */

  const respuestaNeutra = {
    enviado: true,
  };

  if (!email || !validarEmail(email)) {
    return respuestaNeutra;
  }

  try {
    /*
     * Buscar cuenta en Firebase Authentication.
     */

    const usuario =
      await admin.auth().getUserByEmail(email);

    /*
     * Solamente permitimos recuperación mediante
     * este endpoint a usuarios administradores.
     */

    if (usuario.customClaims?.admin !== true) {
      console.warn(
        "Solicitud de recuperación para usuario no administrador:",
        email,
      );

      return respuestaNeutra;
    }

    /*
     * Firebase genera el enlace oficial y seguro
     * para cambiar la contraseña.
     */

    const resetLink =
      await admin
        .auth()
        .generatePasswordResetLink(
          email,
          {
            url: LOGIN_ADMIN_URL,
            handleCodeInApp: false,
          },
        );

    /*
     * Nosotros enviamos ese enlace mediante Resend
     * para mantener la identidad de Join Solution.
     */

    await enviarEmailRecuperacion(
      email,
      resetLink,
    );

    console.log(
      "Email de recuperación administrativa enviado:",
      usuario.uid,
    );

    return respuestaNeutra;
  } catch (error: any) {
    /*
     * Si el usuario no existe tampoco lo informamos
     * al frontend.
     */

    if (error?.code === "auth/user-not-found") {
      console.warn(
        "Solicitud de recuperación para email inexistente.",
      );

      return respuestaNeutra;
    }

    /*
     * Tampoco exponemos errores internos al usuario.
     *
     * Sí quedan registrados en Firebase Functions
     * para que podamos diagnosticarlos.
     */

    console.error(
      "Error recuperando acceso administrativo:",
      error,
    );

    return respuestaNeutra;
  }
}