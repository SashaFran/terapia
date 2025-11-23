document.addEventListener("DOMContentLoaded", async () => {

    const totalPacientesEl = document.getElementById("total-pacientes");
    const totalSesionesEl = document.getElementById("total-sesiones");
    const ultimaSesionEl = document.getElementById("ultima-sesion");

    try {
        /* ============================== TOTAL PACIENTES ============================== */
        const pacientesSnap = await db.collection("pacientes").get();
        const totalPacientes = pacientesSnap.size;
        totalPacientesEl.innerText = totalPacientes;


        /* ============================== TOTAL SESIONES ============================== */
        const sesionesSnap = await db.collection("sesiones").get();
        const totalSesiones = sesionesSnap.size;
        totalSesionesEl.innerText = totalSesiones;


        /* ============================== ÚLTIMA SESIÓN ============================== */
        const ultimaSesionSnap = await db.collection("sesiones")
            .orderBy("fecha", "desc")
            .limit(1)
            .get();

        if (ultimaSesionSnap.empty) {
            ultimaSesionEl.innerText = "—";
        } else {
            const data = ultimaSesionSnap.docs[0].data();

            let fechaSesion = "—";
            if (data.fecha && typeof data.fecha.toDate === "function") {
                fechaSesion = data.fecha.toDate().toLocaleString();
            }

            ultimaSesionEl.innerText = fechaSesion;
        }

    } catch (error) {
        console.error("Error cargando dashboard:", error);
        totalPacientesEl.innerText = "Error";
        totalSesionesEl.innerText = "Error";
        ultimaSesionEl.innerText = "Error";
    }

});
