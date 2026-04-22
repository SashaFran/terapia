import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { generarPdfResultado } from "./generarPdfResultado";


export const descargarInforme = async (resultado: any, paciente: any) => {
  const storage = getStorage();

  let urlDNI = null;
  let urlCaptura = null;

  // ---------------------------------------------------------
  // 1. Obtener DNI (Desde Cloudinary)
  // ---------------------------------------------------------
  try {
    const rutaDNI = paciente?.archivodni;

    if (rutaDNI) {
      // Si la ruta ya es una URL de Cloudinary (contiene "cloudinary" o "http"),
      // la usamos directamente sin pasar por Firebase Storage.
      if (rutaDNI.includes("cloudinary.com") || rutaDNI.startsWith("http")) {
        urlDNI = rutaDNI;
        console.log("DNI cargado desde Cloudinary");
      } 
      // Por si todavía tenés pacientes viejos con rutas de Firebase
      else if (!rutaDNI.startsWith("blob:")) {
        urlDNI = await getDownloadURL(ref(storage, rutaDNI));
        console.log("DNI cargado desde Firebase Storage");
      }
    }
  } catch (e) {
    console.log("DNI no encontrado o error en carga");
  }

  // ---------------------------------------------------------
  // 2. Obtener Captura (Cloudinary)
  // ---------------------------------------------------------
try {
    const rutaCaptura = resultado?.archivoCaptura; // La URL que guardamos del test

    if (rutaCaptura) {
      if (rutaCaptura.includes("cloudinary.com") || rutaCaptura.startsWith("http")) {
        urlCaptura = rutaCaptura;
        console.log("Captura cargada desde Cloudinary");
      } 
      // SI ES FIREBASE (Para resultados viejos): Usamos getDownloadURL
      else {
        urlCaptura = await getDownloadURL(ref(storage, rutaCaptura));
        console.log("Captura cargada desde Firebase Storage");
      }
    }
  } catch (e) {
    console.log("Captura no encontrada o error en carga", e);
  }
  // ---------------------------------------------------------
  // 3. Generar el PDF
  // ---------------------------------------------------------
await generarPdfResultado({
    pacienteNombre: paciente?.nombre || "Paciente",
    resultado,
    fotoDNI: urlDNI || undefined,
    fotoCaptura: urlCaptura || undefined,
  });
};