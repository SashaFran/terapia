import { collection, getDocs, Timestamp } from "firebase/firestore";
import { db } from "../../firebase/firebase";

export const obtenerMetricasPacientes = async () => {
  const colRef = collection(db, "pacientes");
  const querySnapshot = await getDocs(colRef);
  
  const ahora = new Date();
  const unaSemanaAtras = new Date();
  unaSemanaAtras.setDate(ahora.getDate() - 7);
  
  const unMesAtras = new Date();
  unMesAtras.setMonth(ahora.getMonth() - 1);

  let total = 0;
  let nuevosSemana = 0;
  let nuevosMes = 0;

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    total++;

    if (data.fechaInicioAcceso) {
      const fecha = data.fechaInicioAcceso.toDate();
      if (fecha >= unaSemanaAtras) nuevosSemana++;
      if (fecha >= unMesAtras) nuevosMes++;
    }
  });

  return { total, nuevosSemana, nuevosMes };
};