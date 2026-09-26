import { collection, getCountFromServer, query, where } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export const obtenerEstadisticasPacientes = async () => {
  const colRef = collection(db, "pacientes");
  
  const snapshotTotal = await getCountFromServer(colRef);
  
  const qActivos = query(colRef, where("activo", "==", true));
  const snapshotActivos = await getCountFromServer(qActivos);

  return {
    total: snapshotTotal.data().count,
    activos: snapshotActivos.data().count
  };
};