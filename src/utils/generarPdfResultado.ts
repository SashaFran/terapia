import jsPDF from "jspdf";

import logoJoinSolution from "../assets/images/logo.png";

import { formatearTiempoTest } from "./tiempoTest";

import { K10_TEST } from "../data/tests/K10_TEST";
import { BFQ_TEST } from "../data/tests/BFQ_TEST";
import { RAVEN_TEST } from "../data/tests/raven_test";
import { BENDER_TEST } from "../data/tests/bender_test";
import { ZULLIGER_TEST } from "../data/tests/zulliger_test";

/* =========================================================
   TIPOS
========================================================= */

type RGB = [number, number, number];

interface GenerarPdfResultadoParams {
  pacienteNombre: string;
  resultado: any;
  fotoDNI?: string;
  fotoCaptura?: string;
  devolverBlob?: boolean;
}

interface ImagenPreparada {
  data: string;
  format: "PNG" | "JPEG";
  width: number;
  height: number;
}

/* =========================================================
   IDENTIDAD INSTITUCIONAL
========================================================= */

const COLORS = {
  orange: [255, 176, 0] as RGB,
  orangeDark: [255, 136, 0] as RGB,
  red: [255, 60, 42] as RGB,

  text: [44, 44, 44] as RGB,
  muted: [105, 110, 118] as RGB,

  border: [224, 226, 230] as RGB,
  background: [248, 249, 251] as RGB,
  softOrange: [255, 249, 238] as RGB,

  white: [255, 255, 255] as RGB,
  success: [40, 150, 95] as RGB,
};

const PROFESIONAL = {
  nombre: "Lic. Julieta Aguirre",
  titulo: "Licenciada en Psicología",
  matricula: "Matrícula LP 0617",
};

const PAGE = {
  width: 210,
  height: 297,

  marginX: 18,

  contentTop: 31,
  contentBottom: 273,

  footerY: 285,
};

/* =========================================================
   HELPERS GENERALES
========================================================= */

function setTextColor(
  doc: jsPDF,
  color: RGB,
) {
  doc.setTextColor(
    color[0],
    color[1],
    color[2],
  );
}

function setFillColor(
  doc: jsPDF,
  color: RGB,
) {
  doc.setFillColor(
    color[0],
    color[1],
    color[2],
  );
}

function setDrawColor(
  doc: jsPDF,
  color: RGB,
) {
  doc.setDrawColor(
    color[0],
    color[1],
    color[2],
  );
}

function normalizarTestId(
  testId?: string,
): string {
  return String(testId || "")
    .trim()
    .toLowerCase();
}

function nombreTest(
  testId?: string,
): string {
  const id =
    normalizarTestId(testId);

  const nombres: Record<
    string,
    string
  > = {
    k10:
      "Escala de Malestar Psicológico K-10",

    bfq:
      "Escala de Personalidad BFQ",

    raven:
      "Test de Raven Abreviado",

    bender:
      "Test Gestáltico Visomotor de Bender",

    zulliger:
      "Test de Zulliger",

    laminas:
      "Evaluación Proyectiva con Láminas",
  };

  return (
    nombres[id] ||
    String(
      testId ||
        "Evaluación psicológica",
    )
  );
}

function convertirFecha(
  fecha: any,
): Date | null {
  if (!fecha) return null;

  if (
    typeof fecha.toDate === "function"
  ) {
    return fecha.toDate();
  }

  if (
    typeof fecha.seconds === "number"
  ) {
    return new Date(
      fecha.seconds * 1000,
    );
  }

  const date =
    new Date(fecha);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return null;
  }

  return date;
}

function formatearFecha(
  fecha: any,
): string {
  const date =
    convertirFecha(fecha);

  if (!date) {
    return "No disponible";
  }

  return date.toLocaleDateString(
    "es-AR",
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
}

function formatearHora(
  fecha: any,
): string {
  const date =
    convertirFecha(fecha);

  if (!date) {
    return "";
  }

  return date.toLocaleTimeString(
    "es-AR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function limpiarTexto(
  value: any,
): string {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Sin respuesta";
  }

  return String(value);
}

function obtenerRespuesta(
  value: any,
): any {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  if (
    typeof value !== "object"
  ) {
    return value;
  }

  return (
    value.respuesta ??
    value.texto ??
    value.valor ??
    ""
  );
}

/* =========================================================
   IMÁGENES
========================================================= */

async function cargarImagenBase64(
  src: string,
): Promise<ImagenPreparada> {
  const response =
    await fetch(src, {
      mode: "cors",
    });

  if (!response.ok) {
    throw new Error(
      `No se pudo cargar la imagen: ${src}`,
    );
  }

  const blob =
    await response.blob();

  const data =
    await new Promise<string>(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onloadend =
          () => {
            if (
              typeof reader.result ===
              "string"
            ) {
              resolve(
                reader.result,
              );
            } else {
              reject(
                new Error(
                  "No se pudo convertir la imagen.",
                ),
              );
            }
          };

        reader.onerror =
          () => {
            reject(
              new Error(
                "No se pudo leer la imagen.",
              ),
            );
          };

        reader.readAsDataURL(
          blob,
        );
      },
    );

  const dimensiones =
    await obtenerDimensionesImagen(
      data,
    );

  const format:
    | "PNG"
    | "JPEG" =
    data.includes(
      "image/png",
    )
      ? "PNG"
      : "JPEG";

  return {
    data,
    format,
    ...dimensiones,
  };
}

function obtenerDimensionesImagen(
  src: string,
): Promise<{
  width: number;
  height: number;
}> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        resolve({
          width:
            image.naturalWidth ||
            image.width,

          height:
            image.naturalHeight ||
            image.height,
        });
      };

      image.onerror =
        () => reject(
          new Error(
            "No se pudieron obtener las dimensiones de la imagen.",
          ),
        );

      image.src = src;
    },
  );
}

function calcularMedidasImagen(
  imageWidth: number,
  imageHeight: number,
  maxWidth: number,
  maxHeight: number,
) {
  if (
    !imageWidth ||
    !imageHeight
  ) {
    return {
      width: maxWidth,
      height: maxHeight,
    };
  }

  const ratio =
    Math.min(
      maxWidth / imageWidth,
      maxHeight / imageHeight,
    );

  return {
    width:
      imageWidth * ratio,

    height:
      imageHeight * ratio,
  };
}

function crearImagenRotada(
  imageData: string,
  rotacion: number,
): Promise<ImagenPreparada> {
  return new Promise(
    (resolve, reject) => {
      const image =
        new Image();

      image.onload = () => {
        const angle =
          ((rotacion % 360) +
            360) %
          360;

        const swap =
          angle === 90 ||
          angle === 270;

        const canvas =
          document.createElement(
            "canvas",
          );

        canvas.width =
          swap
            ? image.height
            : image.width;

        canvas.height =
          swap
            ? image.width
            : image.height;

        const ctx =
          canvas.getContext(
            "2d",
          );

        if (!ctx) {
          reject(
            new Error(
              "No se pudo preparar la imagen rotada.",
            ),
          );

          return;
        }

        ctx.translate(
          canvas.width / 2,
          canvas.height / 2,
        );

        ctx.rotate(
          (angle * Math.PI) /
            180,
        );

        ctx.drawImage(
          image,
          -image.width / 2,
          -image.height / 2,
        );

        const data =
          canvas.toDataURL(
            "image/png",
          );

        resolve({
          data,
          format: "PNG",
          width:
            canvas.width,
          height:
            canvas.height,
        });
      };

      image.onerror =
        () =>
          reject(
            new Error(
              "No se pudo rotar la imagen.",
            ),
          );

      image.src =
        imageData;
    },
  );
}

/* =========================================================
   CABECERA / PIE
========================================================= */

async function prepararLogo() {
  try {
    return await cargarImagenBase64(
      logoJoinSolution,
    );
  } catch (error) {
    console.error(
      "No se pudo cargar el logo:",
      error,
    );

    return null;
  }
}

function dibujarAcentoSuperior(
  doc: jsPDF,
) {
  setFillColor(
    doc,
    COLORS.orange,
  );

  doc.rect(
    0,
    0,
    70,
    2.2,
    "F",
  );

  setFillColor(
    doc,
    COLORS.orangeDark,
  );

  doc.rect(
    70,
    0,
    70,
    2.2,
    "F",
  );

  setFillColor(
    doc,
    COLORS.red,
  );

  doc.rect(
    140,
    0,
    70,
    2.2,
    "F",
  );
}

function dibujarHeaderPagina(
  doc: jsPDF,
  logo: ImagenPreparada | null,
  testNombre: string,
  pacienteNombre: string,
  paginaPrincipal = false,
) {
  dibujarAcentoSuperior(
    doc,
  );

  if (logo) {
    const medidas =
      calcularMedidasImagen(
        logo.width,
        logo.height,
        37,
        11,
      );

    doc.addImage(
      logo.data,
      logo.format,
      PAGE.marginX,
      8,
      medidas.width,
      medidas.height,
    );
  } else {
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(12);

    setTextColor(
      doc,
      COLORS.text,
    );

    doc.text(
      "JOIN SOLUTION",
      PAGE.marginX,
      15,
    );
  }

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7.5);

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    "INFORME CONFIDENCIAL",
    PAGE.width -
      PAGE.marginX,
    12,
    {
      align: "right",
    },
  );

  if (!paginaPrincipal) {
    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(7.5);

    doc.text(
      `${testNombre} · ${pacienteNombre}`,
      PAGE.width -
        PAGE.marginX,
      17,
      {
        align: "right",
      },
    );
  }

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.setLineWidth(0.3);

  doc.line(
    PAGE.marginX,
    23,
    PAGE.width -
      PAGE.marginX,
    23,
  );
}

function dibujarFooterPagina(
  doc: jsPDF,
  pageNumber: number,
  totalPages: number,
) {
  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.setLineWidth(0.25);

  doc.line(
    PAGE.marginX,
    279,
    PAGE.width -
      PAGE.marginX,
    279,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(7.5);

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    "JOIN SOLUTION · Informe confidencial",
    PAGE.marginX,
    PAGE.footerY,
  );

  doc.text(
    `Página ${pageNumber} de ${totalPages}`,
    PAGE.width -
      PAGE.marginX,
    PAGE.footerY,
    {
      align: "right",
    },
  );
}

/* =========================================================
   CONTROL DE PÁGINAS
========================================================= */

function crearControlPaginas(
  doc: jsPDF,
  logo: ImagenPreparada | null,
  testNombre: string,
  pacienteNombre: string,
) {
  let y =
    PAGE.contentTop;

  const nuevaPagina =
    () => {
      doc.addPage();

      dibujarHeaderPagina(
        doc,
        logo,
        testNombre,
        pacienteNombre,
        false,
      );

      y =
        PAGE.contentTop;
    };

  const asegurarEspacio = (
    requerido: number,
  ) => {
    if (
      y + requerido >
      PAGE.contentBottom
    ) {
      nuevaPagina();
    }
  };

  return {
    getY: () => y,

    setY: (
      value: number,
    ) => {
      y = value;
    },

    avanzar: (
      amount: number,
    ) => {
      y += amount;
    },

    asegurarEspacio,

    nuevaPagina,
  };
}

/* =========================================================
   COMPONENTES VISUALES PDF
========================================================= */

function dibujarTituloSeccion(
  doc: jsPDF,
  titulo: string,
  y: number,
) {
  setFillColor(
    doc,
    COLORS.orange,
  );

  doc.roundedRect(
    PAGE.marginX,
    y + 0.5,
    3,
    8,
    1,
    1,
    "F",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(12);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    titulo,
    PAGE.marginX + 7,
    y + 6.5,
  );

  return y + 14;
}

function dibujarEtiqueta(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
) {
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7);

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    label.toUpperCase(),
    x,
    y,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(10);

  setTextColor(
    doc,
    COLORS.text,
  );

  const lines =
    doc.splitTextToSize(
      value,
      width,
    );

  doc.text(
    lines,
    x,
    y + 6,
  );
}

function dibujarCajaTexto(
  doc: jsPDF,
  titulo: string,
  texto: string,
  y: number,
  width =
    PAGE.width -
    PAGE.marginX * 2,
) {
  const innerWidth =
    width - 12;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9.5);

  const lines =
    doc.splitTextToSize(
      texto,
      innerWidth,
    );

  const height =
    Math.max(
      24,
      17 +
        lines.length *
          4.4,
    );

  setFillColor(
    doc,
    COLORS.background,
  );

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.roundedRect(
    PAGE.marginX,
    y,
    width,
    height,
    3,
    3,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7);

  setTextColor(
    doc,
    COLORS.orangeDark,
  );

  doc.text(
    titulo.toUpperCase(),
    PAGE.marginX + 6,
    y + 7,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9.5);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    lines,
    PAGE.marginX + 6,
    y + 14,
  );

  return height;
}

/* =========================================================
   PORTADA / RESUMEN
========================================================= */

function dibujarInformacionPrincipal(
  doc: jsPDF,
  pacienteNombre: string,
  resultado: any,
) {
  let y = 34;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7.5);

  setTextColor(
    doc,
    COLORS.orangeDark,
  );

  doc.text(
    "EVALUACIÓN PSICOLÓGICA",
    PAGE.marginX,
    y,
  );

  y += 8;

  doc.setFontSize(20);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    "Informe de Evaluación",
    PAGE.marginX,
    y,
  );

  y += 7;

  doc.setFontSize(20);

  doc.text(
    "Psicológica",
    PAGE.marginX,
    y,
  );

  y += 12;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9);

  setTextColor(
    doc,
    COLORS.muted,
  );

  const descripcion =
    doc.splitTextToSize(
      "Registro institucional de la evaluación realizada mediante la plataforma Join Solution.",
      160,
    );

  doc.text(
    descripcion,
    PAGE.marginX,
    y,
  );

  y += 15;

  const cardWidth =
    PAGE.width -
    PAGE.marginX * 2;

  setFillColor(
    doc,
    COLORS.background,
  );

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.roundedRect(
    PAGE.marginX,
    y,
    cardWidth,
    44,
    3,
    3,
    "FD",
  );

  const col1 =
    PAGE.marginX + 7;

  const col2 =
    PAGE.marginX + 92;

  dibujarEtiqueta(
    doc,
    "Paciente",
    pacienteNombre,
    col1,
    y + 10,
    72,
  );

  dibujarEtiqueta(
    doc,
    "Instrumento",
    nombreTest(
      resultado.testId,
    ),
    col2,
    y + 10,
    72,
  );

  const fecha =
    formatearFecha(
      resultado.fecha,
    );

  const hora =
    formatearHora(
      resultado.fecha,
    );

  dibujarEtiqueta(
    doc,
    "Fecha",
    hora
      ? `${fecha} · ${hora}`
      : fecha,
    col1,
    y + 30,
    72,
  );

  dibujarEtiqueta(
    doc,
    "Duración",
    formatearTiempoTest(
      resultado.tiempoTotalMs,
    ),
    col2,
    y + 30,
    72,
  );

  y += 54;

  if (resultado.nivel) {
    y =
      dibujarTituloSeccion(
        doc,
        "Resultado",
        y,
      );

    setFillColor(
      doc,
      COLORS.softOrange,
    );

    setDrawColor(
      doc,
      COLORS.border,
    );

    doc.roundedRect(
      PAGE.marginX,
      y,
      cardWidth,
      22,
      3,
      3,
      "FD",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(7);

    setTextColor(
      doc,
      COLORS.muted,
    );

    doc.text(
      "NIVEL / CLASIFICACIÓN",
      PAGE.marginX + 6,
      y + 7,
    );

    doc.setFontSize(11);

    setTextColor(
      doc,
      COLORS.text,
    );

    doc.text(
      String(
        resultado.nivel,
      ),
      PAGE.marginX + 6,
      y + 15,
    );

    y += 30;
  }

  return y;
}

/* =========================================================
   VERIFICACIÓN DE IDENTIDAD
========================================================= */

async function dibujarVerificacionIdentidad(
  doc: jsPDF,
  y: number,
  fotoDNI?: string,
  fotoCaptura?: string,
) {
  y =
    dibujarTituloSeccion(
      doc,
      "Verificación de identidad",
      y,
    );

  const gap = 7;

  const cardWidth =
    (PAGE.width -
      PAGE.marginX * 2 -
      gap) /
    2;

  const cardHeight = 53;

  const cards = [
    {
      titulo: "DOCUMENTO DE IDENTIDAD",
      src: fotoDNI,
      x: PAGE.marginX,
    },
    {
      titulo:
        "CAPTURA DURANTE LA EVALUACIÓN",
      src: fotoCaptura,
      x:
        PAGE.marginX +
        cardWidth +
        gap,
    },
  ];

  for (const card of cards) {
    setFillColor(
      doc,
      COLORS.background,
    );

    setDrawColor(
      doc,
      COLORS.border,
    );

    doc.roundedRect(
      card.x,
      y,
      cardWidth,
      cardHeight,
      3,
      3,
      "FD",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(6.5);

    setTextColor(
      doc,
      COLORS.muted,
    );

    doc.text(
      card.titulo,
      card.x + 5,
      y + 7,
    );

    if (card.src) {
      try {
        const image =
          await cargarImagenBase64(
            card.src,
          );

        const medidas =
          calcularMedidasImagen(
            image.width,
            image.height,
            cardWidth - 10,
            36,
          );

        const imageX =
          card.x +
          (cardWidth -
            medidas.width) /
            2;

        const imageY =
          y +
          11 +
          (36 -
            medidas.height) /
            2;

        doc.addImage(
          image.data,
          image.format,
          imageX,
          imageY,
          medidas.width,
          medidas.height,
        );
      } catch (error) {
        console.error(
          "Error cargando imagen de verificación:",
          error,
        );

        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(8);

        setTextColor(
          doc,
          COLORS.muted,
        );

        doc.text(
          "Imagen no disponible",
          card.x +
            cardWidth / 2,
          y + 30,
          {
            align: "center",
          },
        );
      }
    } else {
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(8);

      setTextColor(
        doc,
        COLORS.muted,
      );

      doc.text(
        "No disponible",
        card.x +
          cardWidth / 2,
        y + 30,
        {
          align: "center",
        },
      );
    }
  }

  return y + cardHeight + 9;
}

/* =========================================================
   RESPUESTAS K10 / BFQ
========================================================= */

function labelRespuestaK10(
  value: any,
): string {
  const respuesta =
    Number(
      obtenerRespuesta(value),
    );

  const opcion =
    K10_TEST.opciones.find(
      (item: any) =>
        Number(item.valor) ===
        respuesta,
    );

  return opcion
    ? opcion.label
    : limpiarTexto(
        obtenerRespuesta(
          value,
        ),
      );
}

function labelRespuestaBFQ(
  value: any,
): string {
  const respuesta =
    Number(
      obtenerRespuesta(value),
    );

  const opcion =
    BFQ_TEST.opciones.find(
      (item: any) =>
        Number(item.valor) ===
        respuesta,
    );

  return opcion
    ? opcion.label
    : limpiarTexto(
        obtenerRespuesta(
          value,
        ),
      );
}

function dibujarPreguntaTexto(
  doc: jsPDF,
  numero: number,
  pregunta: string,
  respuesta: string,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  const contentWidth =
    PAGE.width -
    PAGE.marginX * 2;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9);

  const questionLines =
    doc.splitTextToSize(
      pregunta,
      contentWidth - 22,
    );

  doc.setFontSize(9.5);

  const answerLines =
    doc.splitTextToSize(
      respuesta,
      contentWidth - 22,
    );

  const questionHeight =
    Math.max(
      5,
      questionLines.length *
        4.2,
    );

  const answerHeight =
    Math.max(
      5,
      answerLines.length *
        4.4,
    );

  const cardHeight =
    17 +
    questionHeight +
    answerHeight;

  control.asegurarEspacio(
    cardHeight + 5,
  );

  const y =
    control.getY();

  setFillColor(
    doc,
    COLORS.white,
  );

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.roundedRect(
    PAGE.marginX,
    y,
    contentWidth,
    cardHeight,
    3,
    3,
    "FD",
  );

  setFillColor(
    doc,
    COLORS.softOrange,
  );

  doc.roundedRect(
    PAGE.marginX + 5,
    y + 6,
    11,
    11,
    2,
    2,
    "F",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(8);

  setTextColor(
    doc,
    COLORS.orangeDark,
  );

  doc.text(
    String(numero).padStart(
      2,
      "0",
    ),
    PAGE.marginX + 10.5,
    y + 13,
    {
      align: "center",
    },
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(9);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    questionLines,
    PAGE.marginX + 21,
    y + 9,
  );

  const answerY =
    y +
    11 +
    questionHeight;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6.5);

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    "RESPUESTA",
    PAGE.marginX + 21,
    answerY,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9.5);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    answerLines,
    PAGE.marginX + 21,
    answerY + 5,
  );

  control.setY(
    y + cardHeight + 5,
  );
}

function dibujarRespuestasTexto(
  doc: jsPDF,
  resultado: any,
  tipo: "k10" | "bfq",
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  control.asegurarEspacio(
    20,
  );

  control.setY(
    dibujarTituloSeccion(
      doc,
      "Detalle de respuestas",
      control.getY(),
    ),
  );

  const preguntas =
    tipo === "k10"
      ? K10_TEST.preguntas
      : BFQ_TEST.preguntas;

  const respuestas =
    Array.isArray(
      resultado.respuestas,
    )
      ? resultado.respuestas
      : [];

  preguntas.forEach(
    (
      pregunta: string,
      index: number,
    ) => {
      const value =
        respuestas[index];

      const respuesta =
        tipo === "k10"
          ? labelRespuestaK10(
              value,
            )
          : labelRespuestaBFQ(
              value,
            );

      dibujarPreguntaTexto(
        doc,
        index + 1,
        pregunta,
        respuesta,
        control,
      );
    },
  );
}

/* =========================================================
   RAVEN / BENDER
========================================================= */

async function dibujarLaminaRespuesta(
  doc: jsPDF,
  titulo: string,
  imageSrc: string,
  respuesta: string,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  control.asegurarEspacio(
    92,
  );

  let y =
    control.getY();

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(10.5);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    titulo,
    PAGE.marginX,
    y + 5,
  );

  y += 10;

  setFillColor(
    doc,
    COLORS.background,
  );

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.roundedRect(
    PAGE.marginX,
    y,
    PAGE.width -
      PAGE.marginX * 2,
    54,
    3,
    3,
    "FD",
  );

  try {
    const image =
      await cargarImagenBase64(
        imageSrc,
      );

    const medidas =
      calcularMedidasImagen(
        image.width,
        image.height,
        145,
        44,
      );

    const x =
      (PAGE.width -
        medidas.width) /
      2;

    const imageY =
      y +
      (54 -
        medidas.height) /
        2;

    doc.addImage(
      image.data,
      image.format,
      x,
      imageY,
      medidas.width,
      medidas.height,
    );
  } catch (error) {
    console.error(
      "Error cargando lámina:",
      error,
    );

    doc.setFontSize(8);

    setTextColor(
      doc,
      COLORS.muted,
    );

    doc.text(
      "Imagen no disponible",
      PAGE.width / 2,
      y + 28,
      {
        align: "center",
      },
    );
  }

  y += 59;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6.5);

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    "RESPUESTA DEL PACIENTE",
    PAGE.marginX,
    y,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9.5);

  setTextColor(
    doc,
    COLORS.text,
  );

  const lines =
    doc.splitTextToSize(
      respuesta,
      PAGE.width -
        PAGE.marginX * 2,
    );

  doc.text(
    lines,
    PAGE.marginX,
    y + 6,
  );

  const textHeight =
    Math.max(
      8,
      lines.length * 4.5,
    );

  control.setY(
    y + textHeight + 10,
  );
}

async function dibujarTestImagenes(
  doc: jsPDF,
  resultado: any,
  tipo: "raven" | "bender",
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  control.asegurarEspacio(
    20,
  );

  control.setY(
    dibujarTituloSeccion(
      doc,
      tipo === "raven"
        ? "Matrices y respuestas"
        : "Láminas y respuestas",
      control.getY(),
    ),
  );

  const images =
    tipo === "raven"
      ? RAVEN_TEST.imagenes
      : BENDER_TEST.imagenes;

  const respuestas =
    Array.isArray(
      resultado.respuestas,
    )
      ? resultado.respuestas
      : [];

  for (
    let index = 0;
    index < images.length;
    index += 1
  ) {
    await dibujarLaminaRespuesta(
      doc,
      tipo === "raven"
        ? `Matriz ${String(
            index + 1,
          ).padStart(2, "0")}`
        : `Lámina ${String(
            index + 1,
          ).padStart(2, "0")}`,

      images[index],

      limpiarTexto(
        obtenerRespuesta(
          respuestas[index],
        ),
      ),

      control,
    );
  }
}

/* =========================================================
   ZULLIGER
========================================================= */

async function dibujarZulliger(
  doc: jsPDF,
  resultado: any,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  control.asegurarEspacio(
    20,
  );

  control.setY(
    dibujarTituloSeccion(
      doc,
      "Láminas, orientaciones y respuestas",
      control.getY(),
    ),
  );

  const respuestas =
    Array.isArray(
      resultado.respuestas,
    )
      ? resultado.respuestas
      : [];

  for (
    let laminaIndex = 0;
    laminaIndex <
    ZULLIGER_TEST.imagenes.length;
    laminaIndex += 1
  ) {
    const imageSrc =
      ZULLIGER_TEST.imagenes[
        laminaIndex
      ];

    let original:
      | ImagenPreparada
      | null = null;

    try {
      original =
        await cargarImagenBase64(
          imageSrc,
        );
    } catch (error) {
      console.error(
        "Error cargando lámina Zulliger:",
        error,
      );
    }

    const registro =
      respuestas.find(
        (item: any) =>
          Number(item?.lamina) ===
          laminaIndex + 1,
      ) ||
      respuestas[laminaIndex];

    const orientaciones =
      Array.isArray(
        registro?.orientaciones,
      )
        ? registro.orientaciones
        : [];

    const rotaciones = [
      0,
      90,
      180,
      270,
    ];

    for (
      const rotacion of rotaciones
    ) {
      control.asegurarEspacio(
        97,
      );

      let y =
        control.getY();

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(10.5);

      setTextColor(
        doc,
        COLORS.text,
      );

      doc.text(
        `Lámina ${String(
          laminaIndex + 1,
        ).padStart(
          2,
          "0",
        )} · Orientación ${rotacion}°`,
        PAGE.marginX,
        y + 5,
      );

      y += 10;

      setFillColor(
        doc,
        COLORS.background,
      );

      setDrawColor(
        doc,
        COLORS.border,
      );

      doc.roundedRect(
        PAGE.marginX,
        y,
        PAGE.width -
          PAGE.marginX * 2,
        57,
        3,
        3,
        "FD",
      );

      if (original) {
        try {
          const rotated =
            rotacion === 0
              ? original
              : await crearImagenRotada(
                  original.data,
                  rotacion,
                );

          const medidas =
            calcularMedidasImagen(
              rotated.width,
              rotated.height,
              145,
              47,
            );

          const imageX =
            (PAGE.width -
              medidas.width) /
            2;

          const imageY =
            y +
            (57 -
              medidas.height) /
              2;

          doc.addImage(
            rotated.data,
            rotated.format,
            imageX,
            imageY,
            medidas.width,
            medidas.height,
          );
        } catch (error) {
          console.error(
            "Error rotando lámina:",
            error,
          );
        }
      }

      y += 63;

      const orientacion =
        orientaciones.find(
          (item: any) =>
            Number(
              item?.rotacion,
            ) === rotacion,
        );

      const respuesta =
        limpiarTexto(
          orientacion?.respuesta,
        );

      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(6.5);

      setTextColor(
        doc,
        COLORS.muted,
      );

      doc.text(
        "RESPUESTA DEL PACIENTE",
        PAGE.marginX,
        y,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(9.5);

      setTextColor(
        doc,
        COLORS.text,
      );

      const lines =
        doc.splitTextToSize(
          respuesta,
          PAGE.width -
            PAGE.marginX * 2,
        );

      doc.text(
        lines,
        PAGE.marginX,
        y + 6,
      );

      const textHeight =
        Math.max(
          8,
          lines.length *
            4.5,
        );

      control.setY(
        y +
          textHeight +
          10,
      );
    }
  }
}

/* =========================================================
   FALLBACK GENÉRICO
========================================================= */

function dibujarFallback(
  doc: jsPDF,
  resultado: any,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  if (
    !Array.isArray(
      resultado.respuestas,
    )
  ) {
    return;
  }

  control.setY(
    dibujarTituloSeccion(
      doc,
      "Detalle de respuestas",
      control.getY(),
    ),
  );

  resultado.respuestas.forEach(
    (
      respuesta: any,
      index: number,
    ) => {
      dibujarPreguntaTexto(
        doc,
        index + 1,
        `Respuesta ${index + 1}`,
        limpiarTexto(
          obtenerRespuesta(
            respuesta,
          ),
        ),
        control,
      );
    },
  );
}

/* =========================================================
   OBSERVACIONES
========================================================= */

function dibujarObservaciones(
  doc: jsPDF,
  resultado: any,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  const observaciones =
    resultado.observacionesIniciales;

  if (!observaciones) {
    return;
  }

  control.asegurarEspacio(
    35,
  );

  control.setY(
    dibujarTituloSeccion(
      doc,
      "Observaciones",
      control.getY(),
    ),
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9.5);

  const lines =
    doc.splitTextToSize(
      String(
        observaciones,
      ),
      PAGE.width -
        PAGE.marginX * 2 -
        12,
    );

  const height =
    Math.max(
      25,
      15 +
        lines.length *
          4.5,
    );

  control.asegurarEspacio(
    height + 5,
  );

  const y =
    control.getY();

  setFillColor(
    doc,
    COLORS.background,
  );

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.roundedRect(
    PAGE.marginX,
    y,
    PAGE.width -
      PAGE.marginX * 2,
    height,
    3,
    3,
    "FD",
  );

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    lines,
    PAGE.marginX + 6,
    y + 10,
  );

  control.setY(
    y + height + 7,
  );
}

/* =========================================================
   RESPONSABLE PROFESIONAL
========================================================= */

function dibujarProfesional(
  doc: jsPDF,
  control: ReturnType<
    typeof crearControlPaginas
  >,
) {
  const requiredHeight = 55;

  control.asegurarEspacio(
    requiredHeight,
  );

  let y =
    control.getY() + 7;

  setDrawColor(
    doc,
    COLORS.border,
  );

  doc.setLineWidth(0.3);

  doc.line(
    PAGE.marginX,
    y,
    PAGE.width -
      PAGE.marginX,
    y,
  );

  y += 10;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(7);

  setTextColor(
    doc,
    COLORS.orangeDark,
  );

  doc.text(
    "PROFESIONAL RESPONSABLE",
    PAGE.marginX,
    y,
  );

  y += 8;

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(11);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    PROFESIONAL.nombre,
    PAGE.marginX,
    y,
  );

  y += 6;

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(9);

  setTextColor(
    doc,
    COLORS.text,
  );

  doc.text(
    PROFESIONAL.titulo,
    PAGE.marginX,
    y,
  );

  y += 5;

  setTextColor(
    doc,
    COLORS.muted,
  );

  doc.text(
    PROFESIONAL.matricula,
    PAGE.marginX,
    y,
  );

  y += 10;

  doc.setFontSize(7.5);

  const nota =
    doc.splitTextToSize(
      "Los resultados de los instrumentos deben ser considerados en el contexto integral de la evaluación profesional.",
      150,
    );

  doc.text(
    nota,
    PAGE.marginX,
    y,
  );

  control.setY(
    y + 12,
  );
}

/* =========================================================
   PAGINACIÓN FINAL
========================================================= */

function aplicarHeadersYFooters(
  doc: jsPDF,
  logo: ImagenPreparada | null,
  testNombre: string,
  pacienteNombre: string,
) {
  const totalPages =
    doc.getNumberOfPages();

  for (
    let page = 1;
    page <= totalPages;
    page += 1
  ) {
    doc.setPage(page);

    /*
     * El header de la primera página
     * ya tiene la cabecera institucional,
     * pero lo redibujamos para mantener
     * el documento consistente.
     */
    dibujarHeaderPagina(
      doc,
      logo,
      testNombre,
      pacienteNombre,
      page === 1,
    );

    dibujarFooterPagina(
      doc,
      page,
      totalPages,
    );
  }
}

/* =========================================================
   GENERADOR PRINCIPAL
========================================================= */

export async function generarPdfResultado({
  pacienteNombre,
  resultado,
  fotoDNI,
  fotoCaptura,
  devolverBlob = false,
}: GenerarPdfResultadoParams) {
  const doc =
    new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

  const logo =
    await prepararLogo();

  const testId =
    normalizarTestId(
      resultado?.testId,
    );

  const testNombre =
    nombreTest(
      resultado?.testId,
    );

  /*
   * =======================================================
   * PRIMERA PÁGINA
   * =======================================================
   */

  dibujarHeaderPagina(
    doc,
    logo,
    testNombre,
    pacienteNombre,
    true,
  );

  let y =
    dibujarInformacionPrincipal(
      doc,
      pacienteNombre,
      resultado,
    );

  y =
    await dibujarVerificacionIdentidad(
      doc,
      y,
      fotoDNI,
      fotoCaptura,
    );

  /*
   * Si queda poco espacio después del bloque
   * inicial, comenzamos el detalle en otra
   * página para que no quede apretado.
   */
  const control =
    crearControlPaginas(
      doc,
      logo,
      testNombre,
      pacienteNombre,
    );

  if (y > 235) {
    control.nuevaPagina();
  } else {
    control.setY(y);
  }

  /*
   * =======================================================
   * CONTENIDO SEGÚN TEST
   * =======================================================
   */

  if (testId === "k10") {
    dibujarRespuestasTexto(
      doc,
      resultado,
      "k10",
      control,
    );
  } else if (
    testId === "bfq"
  ) {
    dibujarRespuestasTexto(
      doc,
      resultado,
      "bfq",
      control,
    );
  } else if (
    testId === "raven"
  ) {
    await dibujarTestImagenes(
      doc,
      resultado,
      "raven",
      control,
    );
  } else if (
    testId === "bender"
  ) {
    await dibujarTestImagenes(
      doc,
      resultado,
      "bender",
      control,
    );
  } else if (
    testId === "zulliger"
  ) {
    await dibujarZulliger(
      doc,
      resultado,
      control,
    );
  } else {
    dibujarFallback(
      doc,
      resultado,
      control,
    );
  }

  /*
   * =======================================================
   * OBSERVACIONES
   * =======================================================
   */

  dibujarObservaciones(
    doc,
    resultado,
    control,
  );

  /*
   * =======================================================
   * RESPONSABLE PROFESIONAL
   * =======================================================
   */

  dibujarProfesional(
    doc,
    control,
  );

  /*
   * =======================================================
   * HEADER + FOOTER + NÚMEROS DE PÁGINA
   * =======================================================
   */

  aplicarHeadersYFooters(
    doc,
    logo,
    testNombre,
    pacienteNombre,
  );

  /*
   * =======================================================
   * SALIDA
   * =======================================================
   */

  if (
    devolverBlob ||
    pacienteNombre === "ZIP"
  ) {
    return doc.output(
      "blob",
    );
  }

  const nombreSeguro =
    pacienteNombre
      .replace(
        /[<>:"/\\|?*]/g,
        "-",
      )
      .replace(
        /\s+/g,
        " ",
      )
      .trim();

  const testSeguro =
    String(
      resultado?.testId ||
        "evaluacion",
    )
      .replace(
        /[<>:"/\\|?*]/g,
        "-",
      )
      .trim();

  doc.save(
    `Informe-${nombreSeguro}-${testSeguro}.pdf`,
  );
}