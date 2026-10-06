export type Asignacion = {
  id?: string;
  pacienteId: string;
  testId: string;
  estado: "pendiente" | "en_curso" | "completado" | "abandono";
  fechaAsignacion: Date;
  fechaCompletado?: Date | null;
};
