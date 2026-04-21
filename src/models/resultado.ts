export type Resultado = {
  estado: string;
  fechaAsignacion: Date;
  fechaCompletado: Date;
  pacienteId: string;
  testId: string;
  archivoCaptura?: string;
  observacionesIniciales?: string;
};