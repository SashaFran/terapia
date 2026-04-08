const formatDuration = (ms: number): string => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
};

export const BFQ_TEST = {
  id: "bfq",
  nombre: "Escala de Personalidad BFQ",
  descripcion: "Evalúa cinco dimensiones de la personalidad.",
  duracionMinutos: 10,
  tipo: "radio",

  opciones: [
    { label: "Completamente falso para mí", valor: 1 },
    { label: "Bastante falso para mí", valor: 2 },
    { label: "Ni verdadero ni falso", valor: 3 },
    { label: "Bastante verdadero para mí", valor: 4 },
    { label: "Completamente verdadero para mí", valor: 5 },
  ],
  
  // Mapeo oficial (índice 0 = Pregunta 1 del PDF). w: 1 (Directa), w: -1 (Inversa)
  mapeo: {
    energia: [
      {i:0, w:1}, {i:12, w:1}, {i:21, w:1}, {i:24, w:1}, {i:38, w:1}, {i:52, w:1}, {i:58, w:1}, {i:72, w:1}, {i:87, w:1}, {i:93, w:1}, {i:101, w:1}, {i:113, w:1},
      {i:6, w:-1}, {i:18, w:-1}, {i:30, w:-1}, {i:36, w:-1}, {i:50, w:-1}, {i:60, w:-1}, {i:64, w:-1}, {i:70, w:-1}, {i:77, w:-1}, {i:98, w:-1}, {i:120, w:-1}, {i:122, w:-1}
    ],
    afabilidad: [
      {i:2, w:1}, {i:9, w:1}, {i:33, w:1}, {i:39, w:1}, {i:47, w:1}, {i:51, w:1}, {i:79, w:1}, {i:85, w:1}, {i:87, w:1}, {i:92, w:1}, {i:107, w:1}, {i:110, w:1},
      {i:3, w:-1}, {i:15, w:-1}, {i:27, w:-1}, {i:42, w:-1}, {i:63, w:-1}, {i:69, w:-1}, {i:73, w:-1}, {i:83, w:-1}, {i:103, w:-1}, {i:108, w:-1}, {i:116, w:-1}, {i:127, w:-1}
    ],
    teson: [
      {i:19, w:1}, {i:25, w:1}, {i:45, w:1}, {i:48, w:1}, {i:56, w:1}, {i:74, w:1}, {i:78, w:1}, {i:91, w:1}, {i:95, w:1}, {i:105, w:1}, {i:114, w:1}, {i:128, w:1},
      {i:7, w:-1}, {i:13, w:-1}, {i:31, w:-1}, {i:37, w:-1}, {i:53, w:-1}, {i:65, w:-1}, {i:81, w:-1}, {i:84, w:-1}, {i:100, w:-1}, {i:106, w:-1}, {i:109, w:-1}, {i:124, w:-1}
    ],
    estabilidad: [
      {i:8, w:1}, {i:20, w:1}, {i:26, w:1}, {i:43, w:1}, {i:49, w:1}, {i:57, w:1}, {i:75, w:1}, {i:80, w:1}, {i:88, w:1}, {i:90, w:1}, {i:118, w:1}, {i:121, w:1},
      {i:14, w:-1}, {i:32, w:-1}, {i:44, w:-1}, {i:61, w:-1}, {i:62, w:-1}, {i:68, w:-1}, {i:82, w:-1}, {i:97, w:-1}, {i:115, w:-1}, {i:119, w:-1}, {i:122, w:-1}, {i:129, w:-1}
    ],
    apertura: [
      {i:4, w:1}, {i:22, w:1}, {i:28, w:1}, {i:40, w:1}, {i:55, w:1}, {i:59, w:1}, {i:71, w:1}, {i:86, w:1}, {i:96, w:1}, {i:104, w:1}, {i:111, w:1}, {i:117, w:1},
      {i:16, w:-1}, {i:41, w:-1}, {i:46, w:-1}, {i:54, w:-1}, {i:64, w:-1}, {i:66, w:-1}, {i:76, w:-1}, {i:89, w:-1}, {i:94, w:-1}, {i:102, w:-1}, {i:123, w:-1}, {i:130, w:-1}
    ],
    distorsion: [
      {i:5, w:1}, {i:11, w:1}, {i:17, w:1}, {i:23, w:1}, {i:29, w:1}, {i:35, w:1}, {i:43, w:1}, {i:79, w:1}, {i:91, w:1}, {i:112, w:1}, {i:126, w:1}, {i:131, w:-1}
    ]
  },


 
preguntas: [
  "Creo que soy una persona activa y vigorosa.",
  "No es necesario comportarse cordialmente con todas las personas.",
  "No me gusta hacer las cosas razonando demasiado en ellas.",
  "No me siento muy atraído por las situaciones nuevas e inesperadas.",
  "Tiendo a implicarme demasiado cuando alguien me cuenta sus problemas.",
  "Siempre he resuelto de inmediato todos los problemas que me he encontrado.",
  "No me preocupan especialmente las consecuencias que mis actos puedan tener sobre los demás.",
  "No me gustan los ambientes de trabajo en los que hay mucha competitividad.",
  "Estoy siempre informado sobre lo que sucede en el mundo.",
  "Llevo a cabo las decisiones que he tomado.",
  "Nunca he dicho una mentira.",
  "No es fácil que algo o alguien me hagan perder la paciencia.",
  "No me gustan las actividades que exigen empeñarse y esforzarse hasta el agotamiento.",
  "Me gusta mezclarme con la gente.",
  "Tiendo a ser muy reflexivo.",
  "Toda novedad me entusiasma.",
  "No suelo sentirme tenso.",
  "Nunca me he asustado ante un peligro, aunque fuera grave.",
  "Noto fácilmente cuándo las personas necesitan de mi ayuda.",
  "Tiendo a decidir rápidamente.",
  "No recuerdo fácilmente los números de teléfono que son largos.",
  "Antes de tomar cualquier iniciativa, me tomo tiempo para valorar las posibles consecuencias.",
  "Siempre he estado completamente de acuerdo con los demás.",
  "No creo ser una persona ansiosa.",
  "Generalmente tiendo a imponerme a las otras personas, más que condescender con ellas.",
  "No suelo saber cómo actuar ante las desgracias de mis amigos.",
  "Ante los obstáculos grandes, no conviene empeñarse en conseguir los objetivos propios.",
  "Tengo muy buena memoria.",
  "Soy más bien susceptible.",
  "Siempre he estado absolutamente seguro de todas mis acciones.",
  "En mi trabajo no le concedo especial importancia a rendir mejor que los demás.",
  "No me gusta vivir de manera demasiado metódica y ordenada.",
  "Me siento vulnerable a las críticas de los demás.",
  "Si es preciso, no tengo inconveniente en ayudar a un desconocido.",
  "No me atraen las situaciones en constante cambio.",
  "Nunca he desobedecido las órdenes recibidas, ni siquiera siendo niño.",
  "No me gustan aquellas actividades en las que es preciso ir de un sitio a otro y moverse continuamente.",
  "No creo que sea preciso esforzarme más allá del límite de las propias fuerzas, incluso aunque haya que cumplir algún plazo.",
  "Estoy dispuesto a esforzarme al máximo con tal de destacar.",
  "Si tengo que criticar a los demás, lo hago, sobre todo cuando se lo merecen.",
  "Creo que no hay valores y costumbres totalmente válidos y eternos.",
  "Para enfrentarse a un problema no es efectivo tener presentes muchos puntos de vista diferentes.",
  "En general no me irrito, ni siquiera en situaciones en las que tendría motivos suficientes para ello.",
  "Si me equivoco, siempre me resulta fácil admitirlo.",
  "Cuando me enfado manifiesto mi malhumor.",
  "Llevo a cabo lo que he decidido, aunque me suponga un esfuerzo no previsto.",
  "No pierdo tiempo en aprender cosas que no estén estrictamente relacionadas con mi campo de intereses.",
  "Casi siempre sé cómo ajustarme a las exigencias de los demás.",
  "Llevo adelante las tareas emprendidas, aunque los resultados iniciales parezcan negativos.",
  "No suelo sentirme solo y triste.",
  "No me gusta hacer varias cosas al mismo tiempo.",
  "Habitualmente muestro una actitud cordial, incluso con las personas que me provocan cierta antipatía.",
  "A menudo estoy completamente absorbido por mis compromisos y actividades.",
  "Cuando algo entorpece mis proyectos, no insisto en conseguirlos e intento otros.",
  "No me interesan los programas televisivos que me exigen esfuerzo e implicación.",
  "Soy una persona que siempre busca nuevas experiencias.",
  "Me molesta mucho el desorden.",
  "No suelo reaccionar de modo impulsivo.",
  "Siempre encuentro buenos argumentos para sostener mis propuestas y convencer a los demás de su validez.",
  "Me gusta estar bien informado, incluso sobre temas alejados de mi ámbito de competencia.",
  "No doy mucha importancia a demostrar mis capacidades.",
  "Mi humor pasa por altibajos frecuentes.",
  "A veces me enfado por cosas de poca importancia.",
  "No hago fácilmente un préstamo, ni siquiera a personas que conozco bien.",
  "No me gusta estar en grupos numerosos.",
  "No suelo planificar mi vida hasta en los más pequeños detalles.",
  "Nunca me han interesado la vida y costumbres de otros pueblos.",
  "No dudo en decir lo que pienso.",
  "A menudo me noto inquieto.",
  "En general no es conveniente mostrarse sensible a los problemas de los demás.",
  "En las reuniones no me preocupo especialmente por llamar la atención.",
  "Creo que todo problema puede ser resuelto de varias maneras.",
  "Si creo que tengo razón, intento convencer a los demás aunque me cueste tiempo y energía.",
  "Normalmente tiendo a no fiarme de mi prójimo.",
  "Difícilmente desisto de una actividad que he comenzado.",
  "No suelo perder la calma.",
  "No dedico mucho tiempo a la lectura.",
  "Normalmente no entablo conversación con compañeros ocasionales de viaje.",
  "A veces soy tan escrupuloso que puedo resultar pesado.",
  "Siempre me he comportado de modo totalmente desinteresado.",
  "No tengo dificultad para controlar mis sentimientos.",
  "Nunca he sido un perfeccionista.",
  "En diversas circunstancias me he comportado impulsivamente.",
  "Nunca he discutido o peleado con otra persona.",
  "Es inútil empeñarse totalmente en algo, porque la perfección no se alcanza nunca.",
  "Tengo en gran consideración el punto de vista de mis compañeros.",
  "Siempre me han apasionado las ciencias.",
  "Me resulta fácil hacer confidencias a los demás.",
  "Normalmente no reacciono de modo exagerado, ni siquiera ante emociones fuertes.",
  "No creo que conocer la historia sirva de mucho.",
  "No suelo reaccionar a las provocaciones.",
  "Nada de lo que he hecho podría haberlo hecho mejor.",
  "Creo que todas las personas tienen algo bueno.",
  "Me resulta fácil hablar con personas que no conozco.",
  "No creo que haya posibilidad de convencer a otro cuando no piensa como nosotros.",
  "Si fracaso en algo, lo intento de nuevo hasta conseguirlo.",
  "Siempre me han fascinado las culturas muy diferentes a la mía.",
  "A menudo me siento nervioso.",
  "No soy una persona habladora.",
  "No merece mucho la pena ajustarse a las exigencias de los compañeros cuando ello supone disminuir el propio ritmo de trabajo.",
  "Siempre he comprendido de inmediato todo lo que he leído.",
  "Siempre estoy seguro de mí mismo.",
  "No comprendo qué empuja a las personas a comportarse de modo diferente a lo normal.",
  "Me molesta mucho que me interrumpan mientras estoy haciendo algo que me interesa.",
  "Me gusta mucho ver programas de información cultural o científica.",
  "Antes de entregar un trabajo, dedico mucho tiempo a revisarlo.",
  "Si algo no se desarrolla tan pronto como deseaba, no insisto demasiado.",
  "Si es preciso, no dudo en decir a los demás que se metan en sus asuntos.",
  "Si alguna acción mía puede llegar a desagradar a alguien, seguramente dejo de hacerla.",
  "Cuando un trabajo está terminado, no me pongo a repasarlo en sus mínimos detalles.",
  "Estoy convencido de que se obtienen mejores resultados cooperando con los demás que compitiendo.",
  "Prefiero leer a practicar alguna actividad deportiva.",
  "Nunca he criticado a otra persona.",
  "Afronto todas mis actividades y experiencias con gran entusiasmo.",
  "Sólo quedo satisfecho cuando veo los resultados de lo que había programado.",
  "Cuando me critican, no puedo evitar exigir explicaciones.",
  "No se obtiene nada en la vida sin ser competitivo.",
  "Siempre intento ver las cosas desde distintos enfoques.",
  "Incluso en situaciones muy difíciles, no pierdo el control.",
  "A veces incluso pequeñas dificultades pueden llegar a preocuparme.",
  "Generalmente no me comporto de manera abierta con los extraños.",
  "No suelo cambiar de humor bruscamente.",
  "No me gustan las actividades que implican riesgo.",
  "Nunca he tenido mucho interés por los temas científicos o filosóficos.",
  "Cuando empiezo a hacer algo, nunca sé si lo terminaré.",
  "Generalmente confío en los demás y en sus intenciones.",
  "Siempre he demostrado simpatía por todas las personas que he conocido.",
  "Con ciertas personas no es necesario ser demasiado tolerante.",
  "Suelo cuidar todas las cosas hasta en sus mínimos detalles.",
  "No es trabajando en grupo como se pueden desarrollar mejor las propias capacidades.",
  "No suelo buscar soluciones nuevas a problemas para los que ya existe una solución eficaz.",
  "No creo que sea útil perder tiempo repasando varias veces el trabajo hecho."
],

  // ---------------------------
  // 🔢 Interpretación clínica
  // ---------------------------
  interpretarResultado: (respuestas: number[]) => {
    const calcular = (dimension: {i: number, w: number}[]) => {
      return dimension.reduce((acc, curr) => {
        const valor = respuestas[curr.i] || 3; // 3 por defecto si falta
        return acc + (curr.w === 1 ? valor : (6 - valor));
      }, 0);
    };

    return {
      E: calcular(BFQ_TEST.mapeo.energia),
      A: calcular(BFQ_TEST.mapeo.afabilidad),
      C: calcular(BFQ_TEST.mapeo.teson),
      S: calcular(BFQ_TEST.mapeo.estabilidad),
      M: calcular(BFQ_TEST.mapeo.apertura),
      L: calcular(BFQ_TEST.mapeo.distorsion)
    };
  },

    generarResumenClinico: (paciente: string, score: any, fecha: Date,
  duracionFormateada: string ) => {
        const interpretar = (val: number) => (val > 85 ? "Alto" : val < 55 ? "Bajo" : "Promedio");
const fechaFormateada = fecha
  ? fecha.toLocaleDateString("es-AR")
  : "Fecha no disponible";

    return `
INFORME CLÍNICO PSICOLÓGICO
Evaluación Big Five (BFQ)

Paciente: ${paciente}
Fecha de evaluación: ${fechaFormateada}
<!-- Tiempo de realización: ${duracionFormateada} -->

Instrumento:
Evaluación de la personalidad en cinco dimensiones fundamentales

Resultados obtenidos:
Puntaje total: No aplica (perfil dimensional)

Energía (E): ${score.E} - ${interpretar(score.E)}
Afabilidad (A): ${score.A} - ${interpretar(score.A)}
Tesón (C): ${score.C} - ${interpretar(score.C)}
Estabilidad Emocional (S): ${score.S} - ${interpretar(score.S)}
Apertura Mental (M): ${score.M} - ${interpretar(score.M)}
Escala de Distorsión (L): ${score.L} ${score.L > 35 ? "(Posible perfil falseado)" : "(Sincero)"}

Observaciones:
Los resultados indican tendencias de personalidad. Un puntaje alto en Tesón sugiere alta responsabilidad, mientras que en Estabilidad indica resiliencia ante el estrés.
`;
  }
};


  
