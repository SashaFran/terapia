import {
  getFunctions,
  httpsCallable,
} from "firebase/functions";

import { auth } from "./firebase";

const functions = getFunctions(auth.app);

/* =========================================================
   RECUPERAR ACCESO ADMINISTRATIVO
========================================================= */

export const recuperarAccesoAdmin =
  httpsCallable<
    {
      email: string;
    },
    {
      enviado: boolean;
    }
  >(
    functions,
    "recuperarAccesoAdminAuth",
  );