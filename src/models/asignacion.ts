export type Asignacion = {
  id?: string;
  pacienteId: string;
  testId: string;
  estado: "pendiente" | "completado" | "abandono";
  fechaAsignacion: Date;
  fechaCompletado?: Date | null;
};
