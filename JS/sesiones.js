document.addEventListener("DOMContentLoaded", async () => {

    const params = new URLSearchParams(window.location.search);
    const pacienteIdDesdePerfil = params.get("id"); // Puede ser null

    const select = document.getElementById("pacienteSelect");
    const snap = await db.collection("pacientes").get();

    /* ---------------------- Fecha actual ---------------------- */

    const today = new Date();
    const formattedDate = today.toLocaleDateString("es-AR");
    document.getElementById("current-date").innerText = formattedDate || 'N/A';

    /* ---------------------- Cargar pacientes ---------------------- */

    select.innerHTML = `<option value="">Seleccionar paciente...</option>`;

    snap.forEach(doc => {
        select.innerHTML += `<option value="${doc.id}">${doc.data().nombre}</option>`;
    });

    /* ---------------------- Si venimos desde perfil.html ---------------------- */

    if (pacienteIdDesdePerfil) {
        select.value = pacienteIdDesdePerfil;
        select.disabled = true; // no editable
    }

    /* ---------------------- Enviar formulario ---------------------- */

    document.getElementById("form-sesion").addEventListener("submit", async (e) => {
        e.preventDefault();

        /* 1) Obtener el paciente final */
        const pacienteIdSeleccionado = pacienteIdDesdePerfil || select.value;

        if (!pacienteIdSeleccionado) {
            alert("Selecciona un paciente o abre el formulario desde su perfil.");
            return;
        }

        /* 2) Armamos la sesión */
        const sesionData = {
            pacienteId: pacienteIdSeleccionado,
            fecha: document.getElementById("fechaSesion").value,
            entornoVR: document.getElementById("entornoVR").value,
            nivelExposicion: document.getElementById("exposicion").value,
            ansiedadDespues: document.getElementById("ansDespues").value || null,
            comentariosPaciente: document.getElementById("comentariosPaciente").value || "",
            observaciones: document.getElementById("observaciones").value || "",
            creadoEn: firebase.firestore.FieldValue.serverTimestamp(),
        };

        /* 3) Guardamos */
        try {
            const docRef = await db.collection("sesiones").add(sesionData);

            console.log("Sesión guardada con ID:", docRef.id);
            alert("Sesión guardada 💙");

            // Redirige distinto según desde dónde se creó
            if (pacienteIdDesdePerfil) {
                window.location.href = `perfil.html?id=${pacienteIdDesdePerfil}`;
            } else {
                window.location.href = "pacientes.html";
            }

        } catch (error) {
            console.error("Error guardando la sesión:", error);
            alert("Hubo un error al guardar la sesión: " + error.message);
        }
    });

});
