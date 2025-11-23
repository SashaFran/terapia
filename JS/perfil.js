document.addEventListener("DOMContentLoaded", async () => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
        console.error("No se encontró el ID del paciente en la URL.");
        document.body.innerHTML = "<h1>Error: ID de paciente no proporcionado.</h1>";
        return;
    }

    try {
        /* =======================
           CARGAR DATOS DEL PACIENTE
        ======================== */
        const pacienteDocSnap = await db.collection("pacientes").doc(id).get();

        if (!pacienteDocSnap.exists) {
            console.error("Paciente no encontrado con el ID:", id);
            document.body.innerHTML = "<h1>Paciente no encontrado.</h1>";
            return;
        }

        const data = pacienteDocSnap.data();
        window.currentPaciente = data;

        document.getElementById("nombre-paciente").innerText = data.nombre || 'N/A';
        document.getElementById("contacto").innerText = data.contacto || 'N/A';

        document.getElementById("fecha-nac").innerText =
            data.fechaNacimiento?.toDate?.().toLocaleDateString() || "N/A";

        document.getElementById("fecha-ingreso").innerText =
            data.fechaIngreso?.toDate?.().toLocaleString() || "N/A";

        document.getElementById("motivo").innerText = data.motivo || 'N/A';
        document.getElementById("notas").innerText = data.notasIniciales || 'N/A';


        /* =======================
           EDITAR PACIENTE
        ======================== */
        document.getElementById("btn-editar").addEventListener("click", () => {
            const modal = document.getElementById("modal-editar");
            const inputNombre = document.getElementById("edit-nombre");
            const inputContacto = document.getElementById("edit-contacto");

            inputNombre.value = window.currentPaciente.nombre || "";
            inputContacto.value = window.currentPaciente.contacto || "";

            modal.style.display = "flex";

            document.getElementById("modal-cerrar").onclick = () => {
                modal.style.display = "none";
            };

            document.getElementById("modal-guardar").onclick = async () => {
                const nuevoNombre = inputNombre.value.trim();
                const nuevoContacto = inputContacto.value.trim();

                try {
                    await db.collection("pacientes").doc(id).update({
                        nombre: nuevoNombre || window.currentPaciente.nombre,
                        contacto: nuevoContacto || window.currentPaciente.contacto,
                    });

                    alert("Paciente actualizado con éxito.");
                    location.reload();

                } catch (error) {
                    alert("Error al actualizar: " + error.message);
                }
            };
        });


        /* =======================
           BORRAR PACIENTE
        ======================== */
        document.getElementById("btn-borrar").addEventListener("click", async () => {
            const seguro = confirm("¿Seguro que quieres borrar este paciente?");

            if (!seguro) return;

            try {
                await db.collection("pacientes").doc(id).delete();
                alert("Paciente eliminado.");
                window.location.href = "pacientes.html";
            } catch (e) {
                alert("Error al borrar.");
            }
        });


        /* =======================
           CARGAR SESIONES
        ======================== */
        const tablaSesiones = document.getElementById("tabla-sesiones");
        tablaSesiones.innerHTML = "";

        const sesionesSnap = await db.collection("sesiones")
            .where("pacienteId", "==", id)
            .get();

        if (sesionesSnap.empty) {
            tablaSesiones.innerHTML =
                '<tr><td colspan="5">No hay sesiones registradas.</td></tr>';
        } else {
            sesionesSnap.forEach(s => {
                const d = s.data();

                const fecha = d.fecha?.toDate?.().toLocaleDateString() || "N/A";

                // Escapar caracteres para que no rompan HTML
                const com = (d.comentariosPaciente || "")
                    .replace(/&/g, "&amp;")
                    .replace(/"/g, "&quot;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");

                const obs = (d.observaciones || "")
                    .replace(/&/g, "&amp;")
                    .replace(/"/g, "&quot;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;");

                tablaSesiones.innerHTML += `
                    <tr>
                        <td>${fecha}</td>
                        <td>${d.entornoVR || "N/A"}</td>
                        <td>${d.nivelExposicion || "N/A"}</td>
                        <td>${d.ansiedadDespues || "N/A"}</td>
                        <td>
                            <button 
                                class="btn-ver-comentarios"
                                data-com="${com}"
                                data-obs="${obs}"
                            >📝</button>
                        </td>
                    </tr>`;
            });
        }


    } catch (error) {
        console.error("ERROR:", error);
        document.getElementById("nombre-paciente").innerText =
            "Error al cargar.";
    }
});


/* =======================
   ABRIR MODAL DE COMENTARIOS
======================= */
document.addEventListener("click", (e) => {
    const btn = e.target.closest(".btn-ver-comentarios");
    if (!btn) return;

    document.getElementById("comentarios-texto").innerText =
        btn.dataset.com || "No hay comentarios.";

    document.getElementById("observaciones-texto").innerText =
        btn.dataset.obs || "No hay observaciones.";

    document.getElementById("modal-comentarios").style.display = "flex";
});

/* CERRAR MODAL */
document.getElementById("cerrar-modal-com").addEventListener("click", () => {
    document.getElementById("modal-comentarios").style.display = "none";
});

window.addEventListener("click", (e) => {
    const modal = document.getElementById("modal-comentarios");
    if (e.target === modal) modal.style.display = "none";
});
