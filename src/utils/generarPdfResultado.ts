/* import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GenerarPdfProps {
  pacienteNombre: string;
  resultado: any;
  fotoDNI?: string;       // Debe ser Base64
  fotoCaptura?: string;   // Debe ser Base64
}

export function generarPdfResultado({
  pacienteNombre,
  resultado,
  fotoDNI,
  fotoCaptura,
}: GenerarPdfProps) {
  
  if (!resultado || !resultado.testId) {
    alert("Información del test incompleta.");
    return;
  }

  const doc = new jsPDF();
  const margin = 14;

  // --- Encabezado ---
  doc.setFontSize(16);
  doc.text("Informe de Evaluación Psicológica", margin, 20);

  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNombre}`, margin, 30);
  doc.text(`Test: ${resultado.testId.toUpperCase()}`, margin, 36);
  
  const fecha = resultado.fecha?.toDate ? resultado.fecha.toDate() : new Date();
  doc.text(`Fecha: ${fecha.toLocaleDateString("es-AR")}`, margin, 42);
  doc.text(`Hora: ${fecha.toLocaleTimeString("es-AR")}`, margin, 48);


  let currentY = (fotoDNI || fotoCaptura) ? 110 : 60;

  // --- Resultado ---
  doc.setFontSize(12);
  doc.text("Resultado", margin, currentY);
  doc.setFontSize(11);
  doc.text(`Puntaje total: ${resultado.score ?? "No aplica"}`, margin, currentY + 8);
  doc.text(`Nivel: ${resultado.nivel}`, margin, currentY + 15);

  // --- Resumen clínico ---
  currentY += 30;
  doc.setFontSize(12);
  doc.text("Resumen clínico", margin, currentY);
  doc.setFontSize(11);
  const resumen = resultado.resumenClinico || "Resumen clínico no disponible.";
  doc.text(resumen, margin, currentY + 8, { maxWidth: 180 });

  // --- Sección de Identidad (FOTOS) ---
// --- Sección de Identidad (FOTOS) ---
// --- Sección de Identidad ---
if (fotoDNI || fotoCaptura) {
  doc.setFontSize(12);
  doc.text("Verificación de Identidad", margin, 60);
  
  if (fotoDNI) {
    doc.setFontSize(9);
    doc.text("Foto DNI:", margin, 68);
    // Agregamos un try-catch interno para que no rompa el PDF si una imagen falla
    try {
      doc.addImage(fotoDNI, 'JPEG', margin, 70, 45, 30);
    } catch (e) {
      doc.rect(margin, 70, 45, 30, 'S'); // Dibuja un recuadro si falla
      doc.text("Error en formato DNI", margin + 2, 85);
    }
  }

  if (fotoCaptura) {
    doc.setFontSize(9);
    doc.text("Captura durante test:", 70, 68);
    try {
      doc.addImage(fotoCaptura, 'JPEG', 70, 70, 45, 30);
    } catch (e) {
      doc.rect(70, 70, 45, 30, 'S');
      doc.text("Error en formato Captura", 72, 85);
    }
  }
  // Bajamos el resto del contenido
  currentY = 110;

}

  // --- Tabla ---
  if (Array.isArray(resultado.respuestas)) {
    const respuestasTabla = resultado.respuestas.map((r: any, i: number) => [
      `Pregunta ${i + 1}`,
      typeof r === "object" ? (r.respuesta || r.valor || "—") : String(r)
    ]);

    autoTable(doc, {
      startY: currentY + 40,
      head: [["Pregunta", "Respuesta"]],
      body: respuestasTabla,
      theme: "grid",
    });
  }

  doc.save(`Informe-${resultado.testId}-${pacienteNombre}.pdf`);
} */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Función crítica para asegurar que la imagen esté lista para jsPDF
const cargarImagen = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // Permite cargar desde Firebase
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export async function generarPdfResultado({
  pacienteNombre,
  resultado,
  fotoDNI,
  fotoCaptura,
}: any) {
  const doc = new jsPDF();
  const margin = 14;

  // Encabezado
  doc.setFontSize(16);
  doc.text("Informe de Evaluación Psicológica", margin, 20);
  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNombre}`, margin, 30);
  doc.text(`Test: ${resultado.testId?.toUpperCase()}`, margin, 36);

  // Sección de Identidad con carga asíncrona
  doc.setFontSize(12);
  doc.text("Verificación de Identidad", margin, 55);

  try {
    // Intentamos cargar y dibujar el DNI
    if (fotoDNI) {
      const imgDNI = await cargarImagen(fotoDNI);
      doc.setFontSize(9);
      doc.text("Foto DNI:", margin, 63);
      doc.addImage(imgDNI, 'JPEG', margin, 65, 45, 30);
    } else {
      doc.text("[DNI No disponible]", margin, 70);
    }

    // Intentamos cargar y dibujar la Captura
    if (fotoCaptura) {
      const imgCaptura = await cargarImagen(fotoCaptura);
      doc.setFontSize(9);
      doc.text("Captura durante test:", 70, 63);
      doc.addImage(imgCaptura, 'JPEG', 70, 65, 45, 30);
    } else {
      doc.text("[Captura No disponible]", 70, 70);
    }
  } catch (error) {
    console.error("Error al renderizar imágenes:", error);
    doc.setTextColor(255, 0, 0);
    doc.text("Error técnico al procesar imágenes de identidad.", margin, 80);
    doc.setTextColor(0, 0, 0);
  }

  const currentY = 105;

  // Resultados
  doc.setFontSize(12);
  doc.text("Resultado", margin, currentY);
  doc.setFontSize(11);
  doc.text(`Nivel: ${resultado.nivel}`, margin, currentY + 10);

  if (Array.isArray(resultado.respuestas)) {
    autoTable(doc, {
      startY: currentY + 20,
      head: [['Pregunta', 'Respuesta']],
      body: resultado.respuestas.map((r: any, i: number) => [
        `Pregunta ${i + 1}`, 
        typeof r === 'object' ? (r.respuesta || "—") : r
      ]),
      theme: 'striped'
    });
  }

  doc.save(`Informe-${pacienteNombre}.pdf`);
}


/* import { getDownloadURL, getStorage, ref } from "firebase/storage";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface GenerarPdfProps {
  pacienteNombre: string;
  resultado: any;
  asignacion?: any;  
  fotoDNI?: string;       // URL o Base64 de la foto del DNI
  fotoCaptura?: string;   // URL o Base64 de la captura de la cámara
}

export function generarPdfResultado({
  pacienteNombre,
  resultado,
  fotoDNI,
  fotoCaptura,
}: GenerarPdfProps) {
  
  if (!resultado || !resultado.testId) {
    alert("Información del test incompleta.");
    return;
  }

  const doc = new jsPDF();
  const margin = 14;
  // Ejemplo de cómo disparar el PDF desde tu dashboard o componente de resultado
  const manejarDescargaPDF = async (paciente: any, resultado: any) => {
  const storage = getStorage();
  
  try {
    // 1. Definimos las rutas. 
    // El DNI viene del objeto paciente, la captura del objeto resultado del test.
    const rutaDNI = paciente.archivodni; 
    const rutaCaptura = resultado.archivoCaptura; 

    // 2. Buscamos las URLs en paralelo
    const [urlDNI, urlCaptura] = await Promise.all([
      rutaDNI ? getDownloadURL(ref(storage, rutaDNI)) : Promise.resolve(null),
      rutaCaptura ? getDownloadURL(ref(storage, rutaCaptura)) : Promise.resolve(null)
    ]);

    // 3. Generamos el PDF
    generarPdfResultado({
      pacienteNombre: paciente.nombre,
      resultado: resultado,
      fotoDNI: urlDNI || undefined,
      fotoCaptura: urlCaptura || undefined
    });

  } catch (error) {
    console.error("Error al obtener imágenes de Firebase:", error);
    // Fallback: Generar informe aunque falten las fotos
    generarPdfResultado({ 
      pacienteNombre: paciente.nombre, 
      resultado 
    });
  }
};



  // --- Encabezado ---
  doc.setFontSize(16);
  doc.text("Informe de Evaluación Psicológica", margin, 20);

  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNombre}`, margin, 30);
  doc.text(`Test: ${resultado.testId.toUpperCase()}`, margin, 36);
  
  const fecha = resultado.fecha?.toDate ? resultado.fecha.toDate() : new Date();
  doc.text(`Fecha: ${fecha.toLocaleDateString("es-AR")}`, margin, 42);
  doc.text(`Hora: ${fecha.toLocaleTimeString("es-AR")}`, margin, 48);

  // --- Sección de Identidad (FOTOS) ---
  // Dibujamos las fotos arriba a la derecha o debajo del encabezado
  if (fotoDNI || fotoCaptura) {
    doc.setFontSize(12);
    doc.text("Verificación de Identidad", margin, 60);
    
    // Posiciones para las fotos (X, Y, Ancho, Alto)
    if (fotoDNI) {
      doc.setFontSize(9);
      doc.text("Foto DNI:", margin, 68);
      // addImage(data, formato, x, y, w, h)
      doc.addImage(fotoDNI, 'JPEG', margin, 70, 45, 30);
    }

    if (fotoCaptura) {
      doc.setFontSize(9);
      doc.text("Captura durante test:", 70, 68);
      doc.addImage(fotoCaptura, 'JPEG', 70, 70, 45, 30);
    }
  }

  // Ajustamos el inicio del resto del contenido dependiendo de si hay fotos
  let currentY = (fotoDNI || fotoCaptura) ? 110 : 60;

  // --- Resultado ---
  doc.setFontSize(12);
  doc.text("Resultado", margin, currentY);
  doc.setFontSize(11);
  doc.text(`Puntaje total: ${resultado.score ?? "No aplica"}`, margin, currentY + 8);
  doc.text(`Nivel: ${resultado.nivel}`, margin, currentY + 15);

  // --- Resumen clínico ---
  currentY += 30;
  doc.setFontSize(12);
  doc.text("Resumen clínico", margin, currentY);
  doc.setFontSize(11);
  const resumen = resultado.resumenClinico || "Resumen clínico no disponible.";
  doc.text(resumen, margin, currentY + 8, { maxWidth: 180 });

  // --- Tabla de respuestas ---
  const formatearRespuesta = (r: any) => {
    if (r === null || r === undefined) return "—";
    if (typeof r === "string" || typeof r === "number") return String(r);
    if (r instanceof File) return "Archivo adjunto";
    if (typeof r === "object") {
      if ("valor" in r) return String(r.valor);
      if ("respuesta" in r) return String(r.respuesta);
    }
    return "—";
  };

  if (Array.isArray(resultado.respuestas)) {
    const respuestasTabla = resultado.respuestas.map((r: any, i: number) => [
      `Pregunta ${i + 1}`,
      formatearRespuesta(r),
    ]);

    autoTable(doc, {
      startY: currentY + 40,
      head: [["Pregunta", "Respuesta"]],
      body: respuestasTabla,
      theme: "grid",
      styles: { fontSize: 10 },
    });
  }

  // --- Footer ---
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.text(
    "Este informe no constituye un diagnóstico clínico por sí mismo. Verificación fotográfica incluida.",
    margin,
    pageHeight - 20
  );

  doc.save(`Informe-${resultado.testId}-${pacienteNombre}.pdf`);
}
 */