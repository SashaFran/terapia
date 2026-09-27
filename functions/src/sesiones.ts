import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";

const testsDisponibles = new Set([
  "k10",
  "bfq",
  "zulliger",
  "bender",
  "raven",
]);

export async function crearSesion(data: Record<string, unknown>) {
  const pacienteId =
    typeof data?.pacienteId === "string"
      ? data.pacienteId.trim()
      : "";

  const fecha =
    typeof data?.fecha === "string"
      ? data.fecha
      : "";

  const testId =
    typeof data?.testId === "string"
      ? data.testId.trim()
      : "";

  const observaciones =
    typeof data?.observaciones === "string"
      ? data.observaciones.trim().slice(0, 2000)
      : "";

  if (!pacienteId || pacienteId.includes("/")) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione un paciente válido.",
    );
  }

  if (!testsDisponibles.has(testId)) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione un test válido.",
    );
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione una fecha válida.",
    );
  }

  const fechaEvaluacion = new Date(`${fecha}T00:00:00-03:00`);

  if (!Number.isFinite(fechaEvaluacion.getTime())) {
    throw new HttpsError(
      "invalid-argument",
      "Seleccione una fecha válida.",
    );
  }

  const db = admin.firestore();

  const pacienteRef = db.collection("pacientes").doc(pacienteId);
  const pacienteSnap = await pacienteRef.get();

  if (!pacienteSnap.exists) {
    throw new HttpsError(
      "not-found",
      "El paciente seleccionado no existe.",
    );
  }

  const sesionRef = db.collection("sesiones").doc();

  await sesionRef.set({
    pacienteId,
    fecha: admin.firestore.Timestamp.fromDate(fechaEvaluacion),
    testId,
    estado: "en_progreso",
    observacionesIniciales: observaciones,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    sesionId: sesionRef.id,
    pacienteId,
    testId,
  };
}