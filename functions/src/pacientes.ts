import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v1/https";

const testsDisponibles = new Set(["k10", "bfq", "zulliger", "bender", "raven"]);

function codigo(error: unknown) {
  return (error as { code?: string })?.code;
}

export function validarAlta(data: Record<string, unknown>) {
  const dni = typeof data?.dni === "string" ? data.dni.replace(/\D/g, "") : "";
  const nombre = typeof data?.nombre === "string" ? data.nombre.trim() : "";
  const tests = Array.isArray(data?.testsSeleccionados) ? [...new Set(data.testsSeleccionados)] : [];
  if (dni.length < 6 || dni.length > 12 || !nombre || nombre.length > 200) {
    throw new HttpsError("invalid-argument", "Ingrese un nombre y un DNI de entre 6 y 12 números.");
  }
  if (!tests.length || tests.some((test) => typeof test !== "string" || !testsDisponibles.has(test))) {
    throw new HttpsError("invalid-argument", "Seleccione al menos un test válido.");
  }
  const fecha = typeof data.fechaIngreso === "string" ? data.fechaIngreso : "";
  const inicio = new Date(`${fecha}T00:00:00-03:00`);
  const hoyArgentina = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || !Number.isFinite(inicio.getTime()) ||
      inicio.toISOString().slice(0, 10) !== fecha || fecha < hoyArgentina) {
    throw new HttpsError("invalid-argument", "Seleccione una fecha válida, desde hoy (hora de Argentina).");
  }
  return { dni, nombre, tests: tests as string[], inicio,
    contacto: typeof data.contacto === "string" ? data.contacto.trim().slice(0, 300) : "" };
}

async function usuarioPorEmail(email: string) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (error) {
    if (codigo(error) === "auth/user-not-found") return null;
    throw error;
  }
}

// Serialize Auth and Firestore operations for the same DNI; leases recover crashed calls.
async function conBloqueo<T>(dni: string, action: () => Promise<T>): Promise<T> {
  const db = admin.firestore();
  const ref = db.collection("pacienteOperaciones").doc(dni);
  const token = db.collection("pacienteOperaciones").doc().id;
  await db.runTransaction(async (tx) => {
    const lock = await tx.get(ref);
    if (lock.exists && lock.data()!.hasta > Date.now()) {
      throw new HttpsError("aborted", "Hay otra operación para este DNI. Intente nuevamente en un momento.");
    }
    tx.set(ref, { token, hasta: Date.now() + 120000 });
  });
  try {
    return await action();
  } finally {
    await db.runTransaction(async (tx) => {
      const lock = await tx.get(ref);
      if (lock.data()?.token === token) tx.delete(ref);
    }).catch((error) => console.error("No se pudo liberar la operación", error));
  }
}

export async function crearPaciente(data: Record<string, unknown>) {
  const { dni, nombre, tests, inicio, contacto } = validarAlta(data);
  return conBloqueo(dni, async () => {
    const db = admin.firestore();
    const pacientes = db.collection("pacientes");
    const existente = await pacientes.where("dni", "==", dni).limit(1).get();
    if (!existente.empty) throw new HttpsError("already-exists", "Ya existe un paciente con este DNI.");

    const email = `${dni}@paciente.com`;
    const anterior = await usuarioPorEmail(email);
    if (anterior) {
      const vinculado = await pacientes.where("uid", "==", anterior.uid).limit(1).get();
      if (!vinculado.empty || Object.keys(anterior.customClaims || {}).length > 0) {
        throw new HttpsError("already-exists", "El DNI está vinculado a una cuenta existente. Revise su perfil.");
      }
      // Repair legacy deletions only for unlinked synthetic patient accounts.
      await admin.auth().deleteUser(anterior.uid);
    }

    const password = dni.slice(-6);
    const user = await admin.auth().createUser({ email, password });
    const paciente = pacientes.doc();
    const batch = db.batch();
    batch.set(paciente, {
      uid: user.uid, nombre, dni, password, contacto, activo: true,
      fechaInicioAcceso: admin.firestore.Timestamp.fromDate(inicio),
      fechaFinAcceso: admin.firestore.Timestamp.fromMillis(inicio.getTime() + 86400000),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    for (const testId of tests) {
      batch.set(db.collection("asignaciones").doc(), {
        pacienteId: paciente.id, testId, estado: "pendiente",
        fechaAsignacion: admin.firestore.Timestamp.fromDate(inicio), fechaCompletado: null,
      });
    }
    try {
      await batch.commit();
    } catch (error) {
      // A lost response can hide a successful commit; verify before compensating Auth.
      const guardado = await paciente.get();
      if (!guardado.exists) {
        await admin.auth().deleteUser(user.uid);
        throw error;
      }
    }
    return { pacienteId: paciente.id, uid: user.uid, dni, password };
  });
}

export async function eliminarPaciente(data: Record<string, unknown>, adminUid: string) {
  const id = typeof data?.pacienteId === "string" ? data.pacienteId : "";
  if (!id || id.includes("/")) throw new HttpsError("invalid-argument", "Paciente inválido.");
  const db = admin.firestore();
  const ref = db.collection("pacientes").doc(id);
  const inicial = await ref.get();
  if (!inicial.exists) return { eliminado: true };
  const dni = String(inicial.data()!.dni).replace(/\D/g, "");
  if (!dni) throw new HttpsError("failed-precondition", "El paciente no tiene un DNI válido.");
  return conBloqueo(dni, async () => {
    const paciente = await ref.get();
    if (!paciente.exists) return { eliminado: true };
    const user = await usuarioPorEmail(`${dni}@paciente.com`);
    if (user) {
      if (user.uid === adminUid || Object.keys(user.customClaims || {}).length > 0 ||
          (paciente.data()!.uid && paciente.data()!.uid !== user.uid)) {
        throw new HttpsError("failed-precondition", "La cuenta no coincide con el paciente. No se eliminó.");
      }
      const vinculados = await db.collection("pacientes").where("uid", "==", user.uid).get();
      if (vinculados.docs.some((doc) => doc.id !== id)) {
        throw new HttpsError("failed-precondition", "La cuenta está vinculada a otro perfil.");
      }
      // Auth first: failures leave the profile available for an administrator to retry.
      await admin.auth().deleteUser(user.uid);
    }
    for (const collection of ["asignaciones", "resultados", "sesiones", "test_progress"]) {
      const field = collection === "test_progress" ? "userId" : "pacienteId";
      let snapshot;
      do {
        snapshot = await db.collection(collection).where(field, "==", id).limit(400).get();
        if (!snapshot.empty) {
          const batch = db.batch();
          snapshot.docs.forEach((doc) => batch.delete(doc.ref));
          await batch.commit();
        }
      } while (!snapshot.empty);
    }
    await ref.delete();
    return { eliminado: true };
  });
}
