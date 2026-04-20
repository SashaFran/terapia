export type Asignacion = {
  id?: string;
  pacienteId: string;
  testId: string;
  estado: "pendiente" | "completado";
  fechaAsignacion: Date;
  fechaCompletado?: Date | null;
};