import { onCall, onRequest, HttpsError } from "firebase-functions/v1/https";
import { pubsub } from "firebase-functions/v1";
import { iniciarAcceso, operarAcceso, expirarAccesos } from "./accesoPaciente";

export const iniciarAccesoPaciente = onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Inicie sesión.");
  return iniciarAcceso(context.auth.uid, data?.token);
});
export const actualizarAccesoPaciente = onCall(async (data, context) => {
  if (!context.auth) throw new HttpsError("unauthenticated", "Inicie sesión.");
  return operarAcceso(context.auth.uid, data);
});
export const cerrarAccesoPaciente = onRequest(async (req, res) => {
  // The 256-bit capability grants only closure, never reads or account reopening.
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method !== "POST") { res.status(405).end(); return; }
  try {
    const input = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    await operarAcceso(null, { pacienteId: input?.pacienteId, token: input?.token, accion: "cerrar" });
    res.status(204).end();
  } catch { res.status(400).end(); }
});
export const expirarSesionesPaciente = pubsub.schedule("every 1 minutes").onRun(async () => {
  await expirarAccesos();
});
