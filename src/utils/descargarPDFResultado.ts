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

/* =========================================================
   HELPERS
========================================================= */

function formatearFecha(
  fecha: any,
): string {
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

  if (
    Number.isNaN(date.getTime())
  ) {
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

/* =========================================================
   DESCARGAR PDF INDIVIDUAL
========================================================= */

export async function descargarPdfResultado(
  paciente: Paciente,
  resultado: Resultado,
) {
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

  if (!(blob instanceof Blob)) {
    throw new Error(
      `No se pudo generar el PDF del resultado ${resultado.id}`,
    );
  }

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

  saveAs(
    blob,
    `${nombrePaciente}_${nombreTest}_${fecha}.pdf`,
  );
}