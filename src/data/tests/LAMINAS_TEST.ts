export const LAMINAS_TEST = {
  id: "laminas",
  nombre: "Evaluación Proyectiva con Láminas",
  descripcion: "Evaluación proyectiva mediante estímulos visuales (Zulliger y Bender).",
  duracionMinutos: 15,
  tipo: "laminas",

  // ---------------------------
  // 🧠 Interpretación base
  // ---------------------------
  interpretarResultado: () => {
    return "Evaluación proyectiva cualitativa";
  },

  // ---------------------------
  // 🧠 Resumen clínico automático
  // ---------------------------
  generarResumenClinico: ({
    pacienteNombre,
    fecha,
    respuestas,
    duracionFormateada
  }: {
    pacienteNombre: string;
    fecha: Date;
    respuestas: any;
    duracionFormateada?: string;
  }) => {

    if (!respuestas) {
      return "No se registraron respuestas durante la evaluación.";
    }

    // ---------------------------
    // 🧾 Header
    // ---------------------------
    let contenido = `
INFORME CLÍNICO PSICOLÓGICO
Evaluación Proyectiva con Láminas

Paciente: ${pacienteNombre}
Fecha de evaluación: ${fecha.toLocaleDateString("es-AR")}
${duracionFormateada ? `Tiempo de realización: ${duracionFormateada}` : ""}

Instrumento:
Técnicas proyectivas gráficas (Zulliger y Test de Bender)

Resultados obtenidos:
`;

    // ---------------------------
    // 🧠 ZULLIGER
    // ---------------------------
    contenido += `\n🧠 ZULLIGER\n`;

    if (respuestas.zulliger?.length) {
      respuestas.zulliger.forEach((r: any, i: number) => {
        const texto =
          typeof r === "string"
            ? r
            : r?.texto || r?.respuesta || "Sin respuesta";

        contenido += `Lámina ${i + 1}: ${texto}\n`;
      });
    } else {
      contenido += "Sin respuestas registradas.\n";
    }

    // ---------------------------
    // 🧠 BENDER
    // ---------------------------
    contenido += `\n🧠 BENDER\n`;

    if (respuestas.bender?.length) {
      respuestas.bender.forEach((r: any, i: number) => {
        const texto =
          typeof r === "string"
            ? r
            : r?.texto || r?.respuesta || "Sin respuesta";

        contenido += `Lámina ${i + 1}: ${texto}\n`;
      });
    } else {
      contenido += "Sin respuestas registradas.\n";
    }

    // ---------------------------
    // 🧠 Interpretación clínica
    // ---------------------------
    contenido += `

Interpretación clínica:
Las técnicas proyectivas utilizadas permiten explorar aspectos de la organización perceptual,
los procesos cognitivos y la dinámica emocional del paciente.

Las respuestas brindadas deben ser analizadas de forma cualitativa por el profesional,
considerando indicadores como coherencia, simbolización, organización perceptual y
contenido emocional.

Observaciones:
Este informe constituye un registro descriptivo de las respuestas del paciente.
No representa un diagnóstico por sí mismo y debe integrarse con entrevista clínica
y otras herramientas de evaluación psicológica.
`;

    return contenido;
  },
};