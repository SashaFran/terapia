import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";

type ModoTests = "ninguno" | "abandonados" | "manual";

type Recuperacion = {
  pacienteId: string;
  reactivarCuenta: boolean;
  modoTests: ModoTests;
  asignacionIds?: string[];
  fechaInicioAccesoMs?: number;
};

const DURACION_ACCESO_MS = 24 * 60 * 60 * 1000;
const ID_VALIDO = /^[\w-]{1,128}$/;

export async function recuperarPaciente(
  data: Recuperacion,
  adminUid: string,
) {
  if (!data || typeof data.pacienteId !== "string" || !ID_VALIDO.test(data.pacienteId)) {
    throw new HttpsError("invalid-argument", "Paciente inválido.");
  }

  if (
    typeof data.reactivarCuenta !== "boolean" ||
    !["ninguno", "abandonados", "manual"].includes(data.modoTests)
  ) {
    throw new HttpsError("invalid-argument", "Opciones de recuperación inválidas.");
  }

  const ids = data.asignacionIds ?? [];
  if (
    !Array.isArray(ids) ||
    ids.length > 50 ||
    ids.some((id) => typeof id !== "string" || !ID_VALIDO.test(id)) ||
    new Set(ids).size !== ids.length
  ) {
    throw new HttpsError("invalid-argument", "Selección de evaluaciones inválida.");
  }

  if (data.modoTests !== "manual" && ids.length > 0) {
    throw new HttpsError("invalid-argument", "La selección manual no corresponde al modo elegido.");
  }

  let inicioMs: number | null = null;
  if (data.reactivarCuenta) {
    if (
      typeof data.fechaInicioAccesoMs !== "number" ||
      !Number.isSafeInteger(data.fechaInicioAccesoMs) ||
      data.fechaInicioAccesoMs <= 0
    ) {
      throw new HttpsError("invalid-argument", "Seleccioná una fecha de ingreso válida.");
    }
    inicioMs = data.fechaInicioAccesoMs;
    if (inicioMs + DURACION_ACCESO_MS <= Date.now()) {
      throw new HttpsError("failed-precondition", "El nuevo período de acceso ya estaría vencido.");
    }
  }

  if (!data.reactivarCuenta && data.modoTests === "ninguno") {
    throw new HttpsError("invalid-argument", "No se solicitó ninguna recuperación.");
  }

  const db = admin.firestore();
  const pacienteRef = db.collection("pacientes").doc(data.pacienteId);
  const accesoRef = db.collection("accesosPaciente").doc(data.pacienteId);
  const asignacionesQuery = db.collection("asignaciones").where("pacienteId", "==", data.pacienteId);
  const auditoriaRef = db.collection("auditoriaRecuperaciones").doc();

  return db.runTransaction(async (tx) => {
    // Firestore requiere realizar todas las lecturas antes de las escrituras.
    const pacienteSnap = await tx.get(pacienteRef);
    const accesoSnap = await tx.get(accesoRef);
    const asignacionesSnap = await tx.get(asignacionesQuery);

    if (!pacienteSnap.exists) {
      throw new HttpsError("not-found", "El paciente no existe.");
    }

    const paciente = pacienteSnap.data()!;
    const acceso = accesoSnap.data();
    const ahoraMs = Date.now();

    // Evita invalidar una evaluación en curso desde este procedimiento.
    if (acceso?.estado === "activa" && typeof acceso.hastaMs === "number" && acceso.hastaMs > ahoraMs) {
      throw new HttpsError(
        "failed-precondition",
        "El paciente tiene una sesión vigente. Finalizala antes de recuperar el acceso.",
      );
    }

    const abandonadas = asignacionesSnap.docs.filter(
      (doc) => doc.data().estado === "abandono",
    );

    let seleccionadas: typeof abandonadas = [];
    if (data.modoTests === "abandonados") {
      seleccionadas = abandonadas;
    } else if (data.modoTests === "manual") {
      const seleccion = new Set(ids);
      seleccionadas = abandonadas.filter((doc) => seleccion.has(doc.id));
      if (seleccionadas.length !== seleccion.size) {
        throw new HttpsError(
          "failed-precondition",
          "Alguna evaluación seleccionada ya no está abandonada.",
        );
      }
    }

    const ahora = admin.firestore.Timestamp.fromMillis(ahoraMs);
    for (const asignacion of seleccionadas) {
      tx.update(asignacion.ref, {
        estado: "pendiente",
        motivoAbandono: admin.firestore.FieldValue.delete(),
        fechaAbandono: admin.firestore.FieldValue.delete(),
        inicioMs: admin.firestore.FieldValue.delete(),
      });
      const progresoRef = db.collection("test_progress").doc(
        `${data.pacienteId}_${asignacion.data().testId}`,
      );
      tx.delete(progresoRef);
    }

    if (data.reactivarCuenta && inicioMs !== null) {
      if (accesoSnap.exists) tx.delete(accesoRef);
      tx.update(pacienteRef, {
        activo: true,
        accesoEstado: "pendiente",
        fechaInicioAcceso: admin.firestore.Timestamp.fromMillis(inicioMs),
        fechaFinAcceso: admin.firestore.Timestamp.fromMillis(inicioMs + DURACION_ACCESO_MS),
        sesionHasta: admin.firestore.FieldValue.delete(),
      });
    }

    tx.set(auditoriaRef, {
      pacienteId: data.pacienteId,
      administradorUid: adminUid,
      fecha: ahora,
      reactivarCuenta: data.reactivarCuenta,
      modoTests: data.modoTests,
      asignacionesRestablecidas: seleccionadas.map((doc) => doc.id),
      estadoCuentaAnterior: paciente.accesoEstado ?? null,
      ...(inicioMs !== null ? { fechaInicioAccesoMs: inicioMs } : {}),
    });

    return {
      ok: true,
      cuentaReactivada: data.reactivarCuenta,
      testsRestablecidos: seleccionadas.length,
    };
  });
}
