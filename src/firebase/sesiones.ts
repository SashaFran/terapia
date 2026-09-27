import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

const functions = getFunctions(auth.app);

export const crearSesion = httpsCallable<
  {
    pacienteId: string;
    fecha: string;
    testId: string;
    observaciones: string;
  },
  {
    sesionId: string;
    pacienteId: string;
    testId: string;
  }
>(
  functions,
  "crearSesionAuth",
);

export function mensajeErrorSesion(error: unknown) {
  const { code, message } = error as {
    code?: string;
    message?: string;
  };

  if (
    [
      "functions/invalid-argument",
      "functions/not-found",
      "functions/failed-precondition",
      "functions/permission-denied",
      "functions/unauthenticated",
      "functions/aborted",
    ].includes(code || "")
  ) {
    return message || "No se pudo crear la sesión.";
  }

  return "No se pudo crear la sesión. Intente nuevamente; si el problema persiste, contacte a administración.";
}