import * as admin from "firebase-admin";
import { randomBytes } from "node:crypto";
import { HttpsError } from "firebase-functions/v1/https";

// Cuenta exclusivamente ficticia, creada desde una callable protegida por admin.
const ID = "spiderman-testing";
const DNI = "99000001";
const TESTS = ["k10", "bfq", "raven", "zulliger", "bender"];

export async function crearSpiderman() {
  const db = admin.firestore();
  const ref = db.collection("pacientes").doc(ID);
  const existing = await ref.get();
  if (existing.exists) {
    throw new HttpsError("already-exists", "Spiderman ya existe. No se crearon duplicados.");
  }
  const dniDuplicado = await db.collection("pacientes").where("dni", "==", DNI).limit(1).get();
  if (!dniDuplicado.empty) {
    throw new HttpsError("already-exists", "El DNI ficticio de Spiderman ya está reservado.");
  }

  const password = randomBytes(24).toString("base64url");
  let user: admin.auth.UserRecord;
  try {
    user = await admin.auth().createUser({
      email: `${DNI}@paciente.com`,
      password,
      displayName: "Spiderman",
    });
  } catch (error) {
    console.error("Error creando usuario de testing", error);
    throw new HttpsError("failed-precondition", "No se pudo crear la cuenta Auth; revisá si ya existe el correo interno.");
  }

  try {
    const batch = db.batch();
    batch.create(ref, {
      uid: user.uid,
      nombre: "Spiderman",
      dni: DNI,
      contacto: "",
      activo: true,
      accesoEstado: "pendiente",
      esPacienteMaestro: true,
      tipoCuenta: "testing",
      archivodni: null,
      fechaInicioAcceso: admin.firestore.Timestamp.now(),
      fechaFinAcceso: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    for (const testId of TESTS) {
      const asignacion = db.collection("asignaciones").doc();
      batch.create(asignacion, {
        pacienteId: ID,
        testId,
        estado: "pendiente",
        fechaAsignacion: admin.firestore.FieldValue.serverTimestamp(),
        fechaCompletado: null,
      });
    }
    await batch.commit();
  } catch (error) {
    await admin.auth().deleteUser(user.uid).catch(err => console.error("Falló rollback Auth", err));
    console.error("Error creando paciente maestro", error);
    throw new HttpsError("internal", "No se pudo registrar a Spiderman.");
  }
  // La contraseña sólo se devuelve al administrador que invocó la función.
  return { pacienteId: ID, dni: DNI, password };
}
