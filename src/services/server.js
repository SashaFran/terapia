import express from "express";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const app = express();

// CORS configurado para aceptar TODO desde tu React
app.use(cors({
  origin: true, 
  credentials: true,
  methods: ["GET", "POST", "OPTIONS"]
}));

app.use(express.json());

cloudinary.config({
  cloud_name: "dni13rket",
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

app.post("/api/delete-cloudinary", async (req, res) => {
  const { public_id } = req.body;
  console.log("🗑️ Solicitud para borrar:", public_id);

  try {
    // Intentamos borrar (invalidate limpia la caché de la URL)
    const result = await cloudinary.uploader.destroy(public_id, { invalidate: true });
    console.log("✅ Resultado:", result);
    res.json(result);
  } catch (error) {
    console.error("❌ Error:", error);
    res.status(500).json({ error: error.message });
  }
});
const allowedOrigins = [
  "http://localhost:5173",        // Para que sigas pudiendo probar en local
  "https://www.joinsolution.com",   // Tu dominio real
  "https://tu-dominio.com"
];

app.use(cors({
  origin: function (origin, callback) {
    // Si el origen está en la lista o es una petición interna, permitimos
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado por seguridad CORS"));
    }
  },
  credentials: true
}));
app.post('/api/delete-resultado', (req, res) => {
    // ... tu lógica de borrado
    res.json({ message: "Eliminado con éxito" });
});

app.listen(3001, () => console.log("Servidor en puerto 3001"));