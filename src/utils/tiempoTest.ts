export function formatearTiempoTest(tiempoTotalMs: unknown): string {
  if (typeof tiempoTotalMs !== "number" || !Number.isFinite(tiempoTotalMs) || tiempoTotalMs < 0) {
    return "No registrado";
  }
  const segundos = Math.floor(tiempoTotalMs / 1000);
  return `${Math.floor(segundos / 60)} min ${segundos % 60} s`;
}
