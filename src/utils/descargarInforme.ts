import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { generarPdfResultado } from "./generarPdfResultado";



export const descargarInforme = async (resultado: any, paciente: any) => {
  const storage = getStorage();

  let urlDNI = null;
  let urlCaptura = null;

  try {
    const rutaDNI = paciente?.archivodni;

    if (rutaDNI && !rutaDNI.startsWith("blob:")) {
      urlDNI = await getDownloadURL(ref(storage, rutaDNI));
    }
  } catch (e) {
    console.log("DNI no encontrado");
  }

  try {
    if (resultado.archivoCaptura) {
      urlCaptura = await getDownloadURL(
        ref(storage, resultado.archivoCaptura)
      );
    }
  } catch (e) {
    console.log("Captura no encontrada");
  }

  await generarPdfResultado({
  pacienteNombre: paciente.nombre,
  resultado: resultado,
  fotoDNI: urlDNI, // <--- Directo la URL de la BBDD
  fotoCaptura: resultado.archivoCaptura
});
};