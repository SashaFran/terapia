export const getSoftDateInfo = () => {
  const ahora = new Date();
  const diaNombre = ahora.toLocaleDateString("es-AR", { weekday: 'long' });
  const diaNumero = ahora.getDate();
  const mesNombre = ahora.toLocaleDateString("es-AR", { month: 'long' });
  
  const fechaFormateada = `${diaNombre.charAt(0).toUpperCase() + diaNombre.slice(1)}, ${diaNumero} de ${mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}`;
  const horaFormateada = ahora.toLocaleTimeString("es-AR", { hour: '2-digit', minute: '2-digit' });

  return { fecha: fechaFormateada, hora: horaFormateada };
};