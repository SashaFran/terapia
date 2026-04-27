import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const getBase64FromUrl = async (url: string) => {
  // 🔥 pequeño delay para asegurar disponibilidad en Cloudinary
  await new Promise(r => setTimeout(r, 500));

  const res = await fetch(url, { mode: "cors" });

  if (!res.ok) {
    throw new Error("No se pudo cargar la imagen");
  }

  const blob = await res.blob();

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

// Función crítica para asegurar que la imagen esté lista para jsPDF
const cargarImagen = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous"; // 👈 ESTO ES VITAL para Cloudinary
    img.src = src; // La fuente siempre después del crossOrigin
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
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


if (fotoDNI) {
  try {
    const imgDNI = await cargarImagen(fotoDNI);
    doc.setFontSize(9);
    doc.text("Foto DNI:", margin, 63);
    doc.addImage(imgDNI, 'JPEG', margin, 65, 45, 30);
  } catch (e) {
    console.error("Error cargando DNI:", e);
    doc.setTextColor(255, 0, 0);
    doc.text("[Error al cargar DNI]", margin, 70);
    doc.setTextColor(0, 0, 0);
  }
}

// PROCESAR CAPTURA (Independiente del DNI)
if (fotoCaptura) {
  try {
    const base64Captura = await getBase64FromUrl(fotoCaptura);

    doc.setFontSize(9);
    doc.text("Captura durante test:", 70, 63);

    const format = base64Captura.includes("image/png") ? "PNG" : "JPEG";

    doc.addImage(base64Captura, format, 70, 65, 45, 30);

  } catch (e) {
    console.error("Error cargando Captura:", e);
    doc.setTextColor(255, 0, 0);
    doc.text("[Error al cargar Captura]", 70, 70);
    doc.setTextColor(0, 0, 0);
  }
}

  const currentY = 105;
  doc.setFontSize(12);
  doc.text("Verificación de Identidad", margin, 55);
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

  if (pacienteNombre === "ZIP") {
    return doc.output("blob"); // 👉 para zip
  }

  doc.save(`Informe-${pacienteNombre}-${resultado.testId}.pdf`); // individual
  doc.save(`Informe-${pacienteNombre}.pdf`);
}
