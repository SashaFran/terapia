import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export const obtenerEstadisticasPacientes = async () => {
  const colRef = collection(db, "pacientes");
  
  // Total general
  const snapshotTotal = await getCountFromServer(colRef);
  
  // Total activos (opcional)
  const qActivos = query(colRef, where("activo", "==", true));
  const snapshotActivos = await getCountFromServer(qActivos);

  return {
    total: snapshotTotal.data().count,
    activos: snapshotActivos.data().count
  };
};
