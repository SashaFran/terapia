import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();

export const crearPacienteAuth = functions.https.onCall(async (data, context) => {
  // 🔒 Solo admin puede ejecutar
  if (!context.auth) {
    throw new functions.https.HttpsError("unauthenticated", "No autorizado");
  }

  const { email, password } = data;

  try {
    const user = await admin.auth().createUser({
      email,
      password,
    });

    return { uid: user.uid };

  } catch (error: any) {
    throw new functions.https.HttpsError("internal", error.message);
  }
});