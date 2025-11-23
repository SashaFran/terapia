document.addEventListener("DOMContentLoaded", async () => {
    const tabla = document.getElementById("tabla-pacientes");

    try {
        const querySnapshot = await db.collection("pacientes").get();
        tabla.innerHTML = "";
        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Formatear el Timestamp de ingreso
            let fechaIngresoFormateada = "N/A";
            if (data.fechaIngreso && typeof data.fechaIngreso.toDate === 'function') {
                fechaIngresoFormateada = data.fechaIngreso.toDate().toLocaleDateString(); // O toLocaleString() para incluir la hora
            }

            let fechaNacimientoFormateada = "N/A";
            if (data.fechaNacimiento && typeof data.fechaNacimiento.toDate === 'function') {
                fechaNacimientoFormateada = data.fechaNacimiento.toDate().toLocaleDateString();
            }

            tabla.innerHTML += `
            <tr>
                <td>${data.nombre}</td>
                <td>${fechaIngresoFormateada}</td> 
                <td>${data.sesiones || 'N/A'}</td> 
                <td>
                    <button class=btn-pacientes onclick="location.href='perfil.html?id=${doc.id}'">Ver</button>
                </td>
            </tr>`;
        });
    } catch (error) {
        console.error("Error al cargar pacientes: ", error);
        // Aquí puedes agregar lógica para mostrar un mensaje al usuario
    }
});

async function guardarNuevoPaciente(nombre, apellido, dni, fechaNacimiento, contacto, motivo, notasIniciales) { // Añadí los parámetros faltantes
    try {
        const docRef = await db.collection("pacientes").add({
            nombre: nombre,
            // fechaNacimiento: firebase.firestore.FieldValue.serverTimestamp(), // <--- Considera cambiar esto
            fechaNacimiento: fechaNacimiento, // <--- Pasa la fecha de nacimiento real aquí
            contacto: contacto,
            fechaIngreso: firebase.firestore.FieldValue.serverTimestamp(), // Uso correcto aquí
            motivo: motivo,
            notasIniciales: notasIniciales || ""
        });
        console.log("Paciente guardado con ID: ", docRef.id);
        // Aquí podrías añadir lógica para actualizar la UI, por ejemplo, recargar la tabla
    } catch (error) {
        console.error("Error guardando el paciente: ", error);
    }
}


// Ejemplo de cómo llamar a guardarNuevoPaciente (descomenta y adapta a tu UI)
/*
// Si tienes un formulario con un botón de envío:
document.getElementById('formulario-paciente').addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevenir el envío por defecto del formulario

    const nombre = document.getElementById('input-nombre').value;
    const apellido = document.getElementById('input-apellido').value;
    const dni = document.getElementById('input-dni').value;
    const fechaNacimiento = document.getElementById('input-fechaNacimiento').value;
    const notas = document.getElementById('input-notas').value;

    await guardarNuevoPaciente(nombre, apellido, dni, fechaNacimiento, notas);
});
*/
