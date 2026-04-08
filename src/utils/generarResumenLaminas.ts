export function generarResumenLaminas({
  pacienteNombre,
  fecha,
  respuestas,
}: any) {
  if (!respuestas) return "Sin respuestas registradas";

  let contenido = `INFORME CLÍNICO PSICOLÓGICO\n\n`;
  contenido += `Paciente: ${pacienteNombre}\n`;
  contenido += `Fecha: ${fecha.toLocaleDateString("es-AR")}\n\n`;

  contenido += "🧠 ZULLIGER\n";
  respuestas.zulliger?.forEach((r: any, i: number) => {
    const texto =
      typeof r === "string"
        ? r
        : r?.texto || r?.respuesta || "Sin respuesta";

    contenido += `Lámina ${i + 1}: ${texto}\n`;
  });

  contenido += "\n🧠 BENDER\n";
  respuestas.bender?.forEach((r: any, i: number) => {
    const texto =
      typeof r === "string"
        ? r
        : r?.texto || r?.respuesta || "Sin respuesta";

    contenido += `Lámina ${i + 1}: ${texto}\n`;
  });

  return contenido;
}