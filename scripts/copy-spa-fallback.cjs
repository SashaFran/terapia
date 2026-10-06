const fs = require("node:fs");
const path = require("node:path");

const distDirectory = path.resolve(process.cwd(), "dist");
const indexPath = path.join(distDirectory, "index.html");
const fallbackPath = path.join(distDirectory, "404.html");

if (!fs.existsSync(indexPath)) {
  throw new Error(`No se encontro el build de Vite en ${indexPath}`);
}

fs.copyFileSync(indexPath, fallbackPath);
console.log("SPA fallback generado: dist/404.html");
