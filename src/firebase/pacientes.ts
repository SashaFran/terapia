import { getFunctions, httpsCallable } from "firebase/functions";
import { auth } from "./firebase";

const functions = getFunctions(auth.app);

export const crearPaciente = httpsCallable<{
  nombre: string;
  dni: string;
  contacto: string;
  fechaIngreso: string;
  testsSeleccionados: string[];
}, {
  pacienteId: string;
  dni: string;
  password: string;
}>(
  functions,
  "crearPacienteAuth",
);

export const eliminarPaciente = httpsCallable<
  { pacienteId: string },
  { eliminado: boolean }
>(
  functions,
  "eliminarPacienteAuth",
);

export function mensajeErrorPaciente(error: unknown) {
  const { code, message } = error as {
    code?: string;
    message?: string;
  };

  if (
    [
      "functions/already-exists",
      "functions/invalid-argument",
      "functions/failed-precondition",
      "functions/permission-denied",
      "functions/unauthenticated",
      "functions/aborted",
    ].includes(code || "")
  ) {
    return message || "No se pudo completar la operación.";
  }

  return "No se pudo completar la operación. Intente nuevamente; si el problema persiste, contacte a administración.";
}