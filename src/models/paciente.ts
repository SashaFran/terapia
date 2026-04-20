export type Paciente = {
  id?: string;
  nombre: string;
  dni: string;
  password: string;
  contacto: string;
  activo: boolean;
  accesoUtilizado: boolean;
  fechaInicioAcceso: Date;
  fechaFinAcceso: Date;
  archivoDNI?: string;
};