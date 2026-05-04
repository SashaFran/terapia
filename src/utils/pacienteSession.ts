const PACIENTE_STORAGE_KEY = "paciente";
const PACIENTE_ID_STORAGE_KEY = "pacienteId";
const ROL_STORAGE_KEY = "rol";
const TEST_EN_CURSO_STORAGE_KEY = "testEnCurso";

export const getPacienteSession = () => {
  const raw = localStorage.getItem(PACIENTE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setPacienteSession = (paciente: unknown, pacienteId: string) => {
  localStorage.setItem(PACIENTE_STORAGE_KEY, JSON.stringify(paciente));
  localStorage.setItem(PACIENTE_ID_STORAGE_KEY, pacienteId);
  localStorage.setItem(ROL_STORAGE_KEY, "paciente");
};

export const clearPacienteSession = () => {
  localStorage.removeItem(PACIENTE_STORAGE_KEY);
  localStorage.removeItem(PACIENTE_ID_STORAGE_KEY);
  localStorage.removeItem(ROL_STORAGE_KEY);
  localStorage.removeItem(TEST_EN_CURSO_STORAGE_KEY);
};

export const isPacienteAuthenticated = () => {
  const rol = localStorage.getItem(ROL_STORAGE_KEY);
  return rol === "paciente" && !!getPacienteSession();
};

export const setTestEnCurso = (payload: { pacienteId: string; testId: string }) => {
  localStorage.setItem(
    TEST_EN_CURSO_STORAGE_KEY,
    JSON.stringify({
      ...payload,
      startedAt: new Date().toISOString(),
    }),
  );
};

export const clearTestEnCurso = () => {
  localStorage.removeItem(TEST_EN_CURSO_STORAGE_KEY);
};