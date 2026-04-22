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
const formatearDuracion = (ms: number) => {
  const totalSegundos = Math.floor(ms / 1000);

  const horas = Math.floor(totalSegundos / 3600);
  const minutos = Math.floor((totalSegundos % 3600) / 60);
  const segundos = totalSegundos % 60;

  if (horas > 0) {
    return `${horas}h ${minutos}m ${segundos}s`;
  }

  if (minutos > 0) {
    return `${minutos}m ${segundos}s`;
  }

  return `${segundos}s`;
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
  doc.text(
  `Tiempo total: ${formatearDuracion(resultado.tiempoTotalMs)}`,
  margin,
  42
);

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