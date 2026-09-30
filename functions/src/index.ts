import {
  onCall,
  HttpsError,
} from "firebase-functions/v1/https";

import { runWith } from "firebase-functions/v1";

import * as admin from "firebase-admin";

import {
  crearPaciente,
  eliminarPaciente,
} from "./pacientes";

import { crearSesion } from "./sesiones";

import {
  recuperarAccesoAdmin,
} from "./recuperarAdmin";

admin.initializeApp();

/* =========================================================
   VALIDACIÓN ADMIN
========================================================= */

function validarAdmin(context: any) {
  if (!context.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Inicie sesión nuevamente.",
    );
  }

  if (context.auth.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Se requiere una cuenta administradora habilitada.",
    );
  }
}

/* =========================================================
   PACIENTES
========================================================= */

export const crearPacienteAuth = runWith({
  secrets: ["RESEND_API_KEY"],
}).https.onCall(async (data, context) => {
  validarAdmin(context);

  return crearPaciente(data);
});

export const eliminarPacienteAuth = onCall(
  async (data, context) => {
    validarAdmin(context);

    return eliminarPaciente(
      data.pacienteId,
      context.auth!.uid,
    );
  },
);

/* =========================================================
   SESIONES
========================================================= */

export const crearSesionAuth = onCall(
  async (data, context) => {
    validarAdmin(context);

    return crearSesion(data);
  },
);

/* =========================================================
   RECUPERACIÓN DE ADMINISTRADOR
========================================================= */

/*
 * Esta función NO requiere login.
 *
 * Es necesario porque justamente se utiliza cuando
 * el administrador no puede iniciar sesión.
 *
 * Internamente verifica que el email corresponda a
 * una cuenta con custom claim admin === true.
 */

export const recuperarAccesoAdminAuth =
  runWith({
    secrets: ["RESEND_API_KEY"],
  }).https.onCall(async (data) => {
    return recuperarAccesoAdmin(data);
  });
// Patient sessions are enforced server-side; closing is a narrowly scoped capability.
export { iniciarAccesoPaciente, actualizarAccesoPaciente, cerrarAccesoPaciente, expirarSesionesPaciente } from "./accesoEndpoints";
