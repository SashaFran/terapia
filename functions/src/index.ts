import { onCall, HttpsError } from "firebase-functions/v1/https";
import * as admin from "firebase-admin";
import { crearPaciente, eliminarPaciente } from "./pacientes";

admin.initializeApp();

// Preserve the existing name so no legacy callable is left deployed.
export const crearPacienteAuth = onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Inicie sesión nuevamente.");
  if (context.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere una cuenta administradora habilitada.");
  }
  return crearPaciente(data);
});

export const eliminarPacienteAuth = onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Inicie sesión nuevamente.");
  if (context.auth.token.admin !== true) {
    throw new HttpsError("permission-denied", "Se requiere una cuenta administradora habilitada.");
  }
  return eliminarPaciente(data, context.auth.uid);
});
