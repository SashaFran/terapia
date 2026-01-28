import jsPDF from "jspdf";

export function generarPDFClinico({
  titulo,
  contenido,
  nombrePaciente,
}: {
  titulo: string;
  contenido: string;
  nombrePaciente: string;
}) {
  const pdf = new jsPDF();

  // Portada
  pdf.setFontSize(18);
  pdf.text(titulo, 20, 30);

  pdf.setFontSize(12);
  pdf.text(`Paciente: ${nombrePaciente}`, 20, 45);
  pdf.text(`Fecha: ${new Date().toLocaleDateString("es-AR")}`, 20, 55);

  // Línea
  pdf.line(20, 60, 190, 60);

  // Contenido
  pdf.setFontSize(11);
  pdf.text(contenido, 20, 70, {
    maxWidth: 170,
    lineHeightFactor: 1.6,
  });

  // Firma
  pdf.text("Lic. Julieta Aguirre", 20, 260);
  pdf.text("Licenciada en Psicología", 20, 267);
  pdf.text("Matrícula LP 0617", 20, 274);

  pdf.save(`Informe_${nombrePaciente}.pdf`);
}
