import express from "express";
import cors from "cors";
import { v2 as cloudinary } from "cloudinary";
import dotenv from "dotenv";

dotenv.config();
const app = express();

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

  try {
    const result = await cloudinary.uploader.destroy(public_id, { invalidate: true });
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
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Bloqueado por seguridad CORS"));
    }
  },
  credentials: true
}));
app.post('/api/delete-resultado', (req, res) => {
    res.json({ message: "Eliminado con éxito" });
});
