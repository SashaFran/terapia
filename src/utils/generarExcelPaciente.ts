import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

interface Paciente {
  nombre: string;
}

interface Asignacion {
  testId: string;
  estado: string;
  fechaAsignacion?: any;
  fechaCompletado?: any;
}

interface Resultado {
  id: string;
  [key: string]: any;
}

function formatearFecha(fecha: any): string {
  if (!fecha) return "N/A";

  if (typeof fecha.toDate === "function") {
    return fecha.toDate().toLocaleDateString("es-AR");
  }

  if (typeof fecha.seconds === "number") {
    return new Date(
      fecha.seconds * 1000,
    ).toLocaleDateString("es-AR");
  }

  const date = new Date(fecha);

  if (Number.isNaN(date.getTime())) {
    return "N/A";
  }

  return date.toLocaleDateString("es-AR");
}

export function generarExcelPaciente(
  paciente: Paciente,
  asignaciones: Asignacion[],
  _resultados: Resultado[] = [],
) {
  const data = asignaciones.map(
    (asignacion) => ({
      Test: asignacion.testId,
      Estado: asignacion.estado,
      Asignado: formatearFecha(
        asignacion.fechaAsignacion,
      ),
      Completado: formatearFecha(
        asignacion.fechaCompletado,
      ),
    }),
  );

  const worksheet =
    XLSX.utils.json_to_sheet(data);

  const workbook =
    XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    "Tests",
  );

  const archivo = XLSX.write(
    workbook,
    {
      bookType: "xlsx",
      type: "array",
    },
  );

  const blob = new Blob(
    [archivo],
    {
      type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  );

  saveAs(
    blob,
    `tests_${paciente.nombre}.xlsx`,
  );
}