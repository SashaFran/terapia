const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const K10_TEST = {
  id: "k10",
  nombre: "Escala de Malestar Psicológico K-10",
  descripcion: "Evalúa síntomas de ansiedad y depresión durante el último mes.",
  duracionMinutos: 10,
  tipo: "radio",

  opciones: [
    { label: "Nunca", valor: 1 },
    { label: "Pocas veces", valor: 2 },
    { label: "A veces", valor: 3 },
    { label: "Muchas veces", valor: 4 },
    { label: "Siempre", valor: 5 },
  ],

  preguntas: [
    "¿Con frecuencia te has sentido cansado, sin alguna buena razón?",
    "¿Con frecuencia te has sentido nervioso?",
    "¿Con qué frecuencia te has sentido tan nervioso que nada te podía calmar?",
    "¿Con qué frecuencia te has sentido desesperado?",
    "¿Con qué frecuencia te has sentido inquieto o intranquilo?",
    "¿Con qué frecuencia te has sentido tan impaciente que no has podido mantenerte quieto?",
    "¿Con qué frecuencia te has sentido deprimido?",
    "¿Con qué frecuencia has sentido que todo lo que haces representa un gran esfuerzo?",
    "¿Con qué frecuencia te has sentido tan triste que nada podía animarte?",
    "¿Con qué frecuencia te has sentido inútil?",
  ],

  // ---------------------------
  // 🔢 Interpretación clínica
  // ---------------------------
  interpretarResultado: (score: number) => {
    if (score <= 12) {
      return "Malestar psicológico bajo o moderado";
    } else if (score <= 19) {
      return "Malestar psicológico moderado a severo";
    } else if (score <= 29) {
      return "Malestar psicológico severo";
    } else {
      return "Malestar psicológico muy severo";
    }
  },

  // ---------------------------
  // 🧠 Resumen clínico automático
  // ---------------------------
 generarResumenClinico: ({
  pacienteNombre,
  score,
  nivel,
  fecha,
  duracionFormateada 
}: {
  pacienteNombre: string;
  score: number;
  nivel: string;
  fecha: Date;
  duracionFormateada: string; 
}) => {

  let interpretacion = "";

  if (nivel === "Malestar psicológico bajo o moderado") {
    interpretacion = `
El puntaje obtenido sugiere un nivel bajo de distrés psicológico en el período evaluado.
Las respuestas no indican una presencia significativa de síntomas emocionales persistentes,
aunque se recomienda considerar el contexto vital actual y otros factores subjetivos
relevantes durante la evaluación clínica.
`;
  } else if (nivel === "Malestar psicológico moderado a severo") {
    interpretacion = `
El puntaje obtenido indica un nivel moderado de distrés psicológico, compatible con la
presencia ocasional de síntomas emocionales como nerviosismo, cansancio emocional
o estado de ánimo bajo.

Este resultado debe interpretarse dentro del contexto clínico general y su evolución
en el tiempo.
`;
  } else {
    interpretacion = `
El puntaje obtenido sugiere un nivel elevado de distrés psicológico en el período evaluado.
Las respuestas indican una alta frecuencia de síntomas emocionales que podrían estar
interfiriendo en el bienestar emocional general de la persona.

Este resultado no constituye un diagnóstico clínico, pero señala la necesidad de una
evaluación clínica integral.
`;
  }

  return `
INFORME CLÍNICO PSICOLÓGICO
Evaluación Kessler K-10

Paciente: ${pacienteNombre}
Fecha de evaluación: ${fecha.toLocaleDateString("es-AR")}
<!-- Tiempo de realización: ${duracionFormateada} -->

Instrumento:
Escala de Malestar Psicológico K-10 (Kessler et al.)

Resultados obtenidos:
Puntaje total: ${score}
Nivel de malestar: ${nivel}

Interpretación clínica:
${interpretacion}

Observaciones:
La escala K-10 es un instrumento de tamizaje y no constituye un diagnóstico clínico por sí sola.
Los resultados deben ser integrados con entrevista clínica y otras herramientas de evaluación.
`;
}};
