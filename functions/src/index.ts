import { onCall, HttpsError } from "firebase-functions/v1/https";
import { runWith } from "firebase-functions/v1";
import * as admin from "firebase-admin";
import { crearPaciente, eliminarPaciente } from "./pacientes";
import { crearSesion } from "./sesiones";
import { recuperarAccesoAdmin } from "./recuperarAdmin";
import { recuperarPaciente } from "./recuperarPaciente";
import { crearSpiderman } from "./crearSpiderman";

admin.initializeApp();

function validarAdmin(context: any) {
  if (!context.auth) {
    throw new HttpsError("unauthenticated", "Inicie sesión nuevamente.");
  }
  if (context.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere una cuenta administradora habilitada.");
  }
}

export const crearPacienteAuth = runWith({
  secrets: ["RESEND_API_KEY"],
}).https.onCall(async (data, context) => {
  validarAdmin(context);
  return crearPaciente(data);
});

export const eliminarPacienteAuth = onCall(async (data, context) => {
  validarAdmin(context);
  return eliminarPaciente(data.pacienteId, context.auth!.uid);
});

export const crearSesionAuth = onCall(async (data, context) => {
  validarAdmin(context);
  return crearSesion(data);
});

export const recuperarAccesoAdminAuth = runWith({
  secrets: ["RESEND_API_KEY"],
}).https.onCall(async (data) => recuperarAccesoAdmin(data));

export {
  iniciarAccesoPaciente,
  actualizarAccesoPaciente,
  cerrarAccesoPaciente,
  expirarSesionesPaciente,
} from "./accesoEndpoints";

export const recuperarAccesoPacienteAuth = onCall(async (data, context) => {
  validarAdmin(context);
  return recuperarPaciente(data, context.auth!.uid);
});

export const crearSpidermanAuth = onCall(async (_data, context) => {
  validarAdmin(context);
  return crearSpiderman();
});
