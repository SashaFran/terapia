document.addEventListener('DOMContentLoaded', () => {
    const formPaciente = document.getElementById('form-nuevo-paciente');

    if (formPaciente) {
        formPaciente.addEventListener('submit', async (e) => {
            e.preventDefault(); // Previene el envío por defecto del formulario

            // Obtén los valores del formulario
            const nombre = document.getElementById('nombre').value;
            const fechaNacimientoInput = document.getElementById('fechaNacimiento').value; //
            const contacto = document.getElementById('contacto').value;
            const motivo = document.getElementById('motivo').value;
            const notasIniciales = document.getElementById('notasIniciales').value;

            // Validación básica para campos obligatorios
            if (!nombre || !fechaNacimientoInput || !contacto || !motivo) {
                alert("Por favor, rellena todos los campos obligatorios (Nombre, Fecha Nacimiento, Contacto, Motivo).");
                return;
            }

            let fechaNacimientoObjeto = null;
            try {
                fechaNacimientoObjeto = new Date(fechaNacimientoInput);
                if (isNaN(fechaNacimientoObjeto.getTime())) { // Valida si la fecha es válida
                    throw new Error("Fecha de Nacimiento no válida.");
                }
            } catch (error) {
                alert("La Fecha de Nacimiento no es válida. Por favor, usa el formato YYYY-MM-DD.");
                return;
            }

            try {
                const docRef = await window.db.collection("pacientes").add({
                    nombre: nombre,
                    fechaNacimiento: fechaNacimientoObjeto, 
                    contacto: contacto,
                    fechaIngreso: firebase.firestore.FieldValue.serverTimestamp(), 
                    motivo: motivo,
                    notasIniciales: notasIniciales || "" // Si notasIniciales puede ser opcional, usa un default
                });
                console.log("Paciente guardado con ID: ", docRef.id);
                alert("Paciente guardado con éxito!");
                formPaciente.reset(); 
                window.location.href = 'pacientes.html';
            } catch (error) {
                console.error("Error guardando el paciente:", error);
                alert("Hubo un error al guardar el paciente: " + error.message);
            }
        });
    }
});
