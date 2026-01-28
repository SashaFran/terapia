import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export function generarPdfResultado({
  pacienteNombre,
  resultado,
}: {
  pacienteNombre: string;
  resultado: any;
}) {
  // 🛑 Protección básica (NO rompe nada)
  if (!resultado) {
    console.error("Resultado indefinido al generar PDF");
    alert("No se pudo generar el informe. Resultado inexistente.");
    return;
  }

  if (!resultado.testId) {
    console.error("Resultado sin testId:", resultado);
    alert("Resultado incompleto. Falta información del test.");
    return;
  }

  const doc = new jsPDF();

  // -----------------------
  // Encabezado
  // -----------------------
  doc.setFontSize(16);
  doc.text("Informe de Evaluación Psicológica", 14, 20);

  doc.setFontSize(11);
  doc.text(`Paciente: ${pacienteNombre}`, 14, 30);
  doc.text(`Test: ${resultado.testId.toUpperCase()}`, 14, 36);
  doc.text(
    `Fecha: ${
      resultado.fecha?.toDate
        ? resultado.fecha.toDate().toLocaleDateString("es-AR")
        : "—"
    }`,
    14,
    42
  );
  doc.text(
    `Hora: ${
      resultado.fecha?.toDate
        ? resultado.fecha.toDate().toLocaleTimeString("es-AR")
        : "—"
    }`,
    14,
    48
  );

  // -----------------------
  // Resultado
  // -----------------------
  doc.setFontSize(12);
  doc.text("Resultado", 14, 55);

  doc.setFontSize(11);
  doc.text(`Puntaje total: ${resultado.score}`, 14, 63);
  doc.text(`Nivel: ${resultado.nivel}`, 14, 70);

  // -----------------------
  // Resumen clínico
  // -----------------------
  doc.setFontSize(12);
  doc.text("Resumen clínico", 14, 85);

  doc.setFontSize(11);
  const resumen =
    resultado.resumenClinico ||
    "Resumen clínico no disponible.";

  doc.text(resumen, 14, 93, { maxWidth: 180 });

  // -----------------------
  // Tabla de respuestas
  // -----------------------
  if (Array.isArray(resultado.respuestas)) {
    const respuestasTabla = resultado.respuestas.map(
      (r: number, i: number) => [`Pregunta ${i + 1}`, r]
    );

    autoTable(doc, {
      startY: 120,
      head: [["Pregunta", "Respuesta"]],
      body: respuestasTabla,
      theme: "grid",
      styles: { fontSize: 10 },
    });
  }

  // -----------------------
  // Footer
  // -----------------------
  const pageHeight = doc.internal.pageSize.height;
  doc.setFontSize(9);
  doc.text(
    "Este informe no constituye un diagnóstico clínico por sí mismo.",
    14,
    pageHeight - 20
  );

  // -----------------------
  // Descargar
  // -----------------------
  doc.save(
    `Informe-${resultado.testId}-${pacienteNombre}.pdf`
  );
}
