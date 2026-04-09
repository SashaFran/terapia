import img1 from "../../components/Tests/TestRaven/raven/1.png"; import img2 from "../../components/Tests/TestRaven/raven/2.png"; import img3 from "../../components/Tests/TestRaven/raven/3.png"; import img4 from "../../components/Tests/TestRaven/raven/4.png"; import img5 from "../../components/Tests/TestRaven/raven/5.png"; import img6 from "../../components/Tests/TestRaven/raven/6.png"; import img7 from "../../components/Tests/TestRaven/raven/7.png"; import img8 from "../../components/Tests/TestRaven/raven/8.png"; import img9 from "../../components/Tests/TestRaven/raven/9.png"; import img10 from "../../components/Tests/TestRaven/raven/10.png"; import img11 from "../../components/Tests/TestRaven/raven/11.png"; import img12 from "../../components/Tests/TestRaven/raven/12.png";

const formatDuration = (ms: number): string => {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
};

export const RAVEN_TEST = {
  id: "raven",
  nombre: "Test de Raven Abreviado",
  descripcion: "Evalúa la capacidad de razonamiento abstracto y percepción de relaciones.",
  duracionMinutos: 10,
  tipo: "input",

  claves: [1, 7, 8, 5, 5, 7, 6, 8, 1, 1, 6, 3],

  imagenes: [
    img1, img2, img3, img4, img5, img6,
    img7, img8, img9, img10, img11, img12
  ],

  // ---------------------------
  // 🧠 Interpretación clínica
  // ---------------------------
  interpretarResultado: (errores: number) => {
    if (errores === 0) return "Superior";
    if (errores <= 2) return "Normal Superior";
    if (errores <= 4) return "Normal Promedio";
    return "Inferior";
  },

  // ---------------------------
  // 🧠 Resumen clínico automático
  // ---------------------------
  generarResumenClinico: ({
    pacienteNombre,
    fecha,
    respuestas,
    score,
    nivel,
    tiempoTotalMs,
  }: {
    pacienteNombre: string;
    fecha: Date;
    respuestas: any[];
    score: number;
    nivel: string;
    tiempoTotalMs?: number;
  }) => {

    const duracionFormateada = tiempoTotalMs
      ? formatDuration(tiempoTotalMs)
      : null;

    let contenido = `
INFORME CLÍNICO PSICOLÓGICO
Test de Matrices Progresivas de Raven (Forma Abreviada)

Paciente: ${pacienteNombre}
Fecha de evaluación: ${fecha.toLocaleDateString("es-AR")}
${duracionFormateada ? `Tiempo de realización: ${duracionFormateada}` : ""}

Instrumento:
Matrices Progresivas de Raven (forma abreviada)

Resultados obtenidos:
Puntaje total: ${score} / 12
Nivel: ${nivel}

Detalle de respuestas:
`;

    // ---------------------------
    // 🧾 RESPUESTAS
    // ---------------------------
    respuestas?.forEach((r: any, i: number) => {
      const texto =
        typeof r === "string"
          ? r
          : r?.respuesta || "Sin respuesta";

      contenido += `Matriz ${i + 1}: ${texto}\n`;
    });

    // ---------------------------
    // 🧠 Interpretación clínica
    // ---------------------------
    let interpretacion = "";

    if (nivel === "Superior") {
      interpretacion = `
El rendimiento obtenido indica una capacidad sobresaliente para identificar relaciones abstractas
y resolver problemas no verbales. Se evidencia un alto nivel de razonamiento lógico.
`;
    } else if (nivel === "Normal Superior") {
      interpretacion = `
El rendimiento se encuentra por encima del promedio esperado, indicando buenas habilidades
de razonamiento abstracto y capacidad de análisis lógico.
`;
    } else if (nivel === "Normal Promedio") {
      interpretacion = `
El rendimiento se ubica dentro del rango esperado para la población general.
No se observan dificultades significativas en el razonamiento lógico.
`;
    } else {
      interpretacion = `
El rendimiento sugiere dificultades en la identificación de patrones y relaciones abstractas.
Se recomienda complementar con otras herramientas de evaluación cognitiva.
`;
    }

    contenido += `

Interpretación clínica:
${interpretacion}

Observaciones:
El Test de Raven evalúa la inteligencia fluida y la capacidad de razonamiento abstracto.
No constituye por sí solo un diagnóstico clínico y debe integrarse con otras técnicas.
`;

    return contenido;
  },
};