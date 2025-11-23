// helpers para interfaz
export function formatFecha(fechaStr) {
    const f = new Date(fechaStr);
    return f.toLocaleDateString();
}
