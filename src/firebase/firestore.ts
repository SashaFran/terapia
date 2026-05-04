import { db } from "../firebase/firebase";
import { collection, addDoc } from "firebase/firestore";

type ResultadoInput = {
  testId: string;
  score?: number;
  nivel?: string;
  respuestas: number[];
  metodo: string;
  fecha: Date;
  pacienteId: string;
  sesionId: string;
  dimensiones?: {
    extraversion: number;
    amabilidad: number; 
    responsabilidad: number;
    neuroticismo: number;
    apertura: number;
  };
};

export const guardarResultado = async (data: ResultadoInput) => {
  try {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([_, v]) => v !== undefined)
    );

    const docRef = await addDoc(collection(db, "resultados"), cleanData);

    return docRef.id;
  } catch (error) {
    console.error("Error guardando resultado:", error);
    throw error;
  }
};