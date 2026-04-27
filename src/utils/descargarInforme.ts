import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { generarPdfResultado } from "./generarPdfResultado";



export const descargarInforme = async (resultado: any, paciente: any) => {
  const storage = getStorage();

  let urlDNI = null;
  let urlCaptura = null;

  try {
    const rutaDNI = paciente?.archivodni;
    console.log("DNI URL:", urlDNI);
console.log("Captura URL:", urlCaptura);

    if (rutaDNI && !rutaDNI.startsWith("blob:")) {
      urlDNI = await getDownloadURL(ref(storage, rutaDNI));
    }
  } catch (e) {
    console.log("DNI no encontrado");
  }

  try {
    if (resultado.archivoCaptura?.startsWith("http")) {
  urlCaptura = resultado.archivoCaptura;
} else {
  urlCaptura = await getDownloadURL(ref(storage, resultado.archivoCaptura));
}
  } catch (e) {
    console.log("Captura no encontrada");
  }

await generarPdfResultado({
  pacienteNombre: paciente.nombre,
  resultado: resultado,
  fotoDNI: urlDNI,
  fotoCaptura: urlCaptura
});

if (!urlCaptura) {
  console.warn("⚠️ No hay captura, esperando...");
  await new Promise(r => setTimeout(r, 1000));
}
};