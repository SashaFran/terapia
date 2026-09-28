import JSZip from "jszip";
import { saveAs } from "file-saver";

import {
  generarPdfResultado,
} from "./generarPdfResultado";

interface Paciente {
  nombre: string;
  archivodni?: string;
}

interface Resultado {
  id: string;
  fecha?: any;
  testId?: string;
  nivel?: string;
  pacienteId?: string;
  observacionesIniciales?: string;
  archivoCaptura?: string;
  [key: string]: any;
}

function formatearFecha(fecha: any): string {
  if (!fecha) return "N-A";

  let date: Date;

  if (
    typeof fecha.toDate === "function"
  ) {
    date = fecha.toDate();
  } else if (
    typeof fecha.seconds === "number"
  ) {
    date = new Date(
      fecha.seconds * 1000,
    );
  } else {
    date = new Date(fecha);
  }

  if (Number.isNaN(date.getTime())) {
    return "N-A";
  }

  return date
    .toLocaleDateString("es-AR")
    .replace(/\//g, "-");
}

function limpiarNombreArchivo(
  valor: string,
): string {
  return valor
    .replace(/[<>:"/\\|?*]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export async function generarZipPaciente(
  paciente: Paciente,
  resultados: Resultado[],
) {
  const zip = new JSZip();

  for (const resultado of resultados) {
    try {
      const blob =
        await generarPdfResultado({
          pacienteNombre:
            paciente.nombre,

          devolverBlob: true,

          resultado,

          fotoDNI:
            paciente.archivodni,

          fotoCaptura:
            resultado.archivoCaptura,
        });

      if (blob instanceof Blob) {
        const nombrePaciente =
          limpiarNombreArchivo(
            paciente.nombre,
          );

        const nombreTest =
          limpiarNombreArchivo(
            resultado.testId ||
              "evaluacion",
          );

        const fecha =
          formatearFecha(
            resultado.fecha,
          );

        const nombreArchivo =
          `${nombrePaciente}_${nombreTest}_${fecha}.pdf`;

        zip.file(
          nombreArchivo,
          blob,
        );
      }
    } catch (error) {
      console.error(
        "Error generando PDF para ZIP:",
        resultado.id,
        error,
      );
    }
  }

  const contenidoZip =
    await zip.generateAsync({
      type: "blob",
    });

  const nombrePaciente =
    limpiarNombreArchivo(
      paciente.nombre,
    );

  saveAs(
    contenidoZip,
    `reportes_${nombrePaciente}.zip`,
  );
}