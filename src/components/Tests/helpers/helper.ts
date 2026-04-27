export function completarRespuestas(
  respuestas: any[],
  totalEsperado: number,
  tipo: string
) {
  const completadas = [...respuestas];

  for (let i = completadas.length; i < totalEsperado; i++) {
    completadas.push({
      pregunta: `${tipo} ${i + 1}`,
      respuesta: "out_of_time",
    });
  }

  return completadas;
}