import { useEffect, useRef, useState } from "react";
import { db } from "../../../firebase/firebase";
import { addDoc, collection, doc, setDoc } from "firebase/firestore";
import { useCameraCapture } from "./useCameraCapture";

type Config = {
  userId: string | number;
  testId: string;
  timeLimitMs: number;
  autoSaveIntervalMs?: number;
  onFinish: (data: any) => void;
};

export function useTestEngine({
  userId,
  testId,
  timeLimitMs,
  autoSaveIntervalMs = 10000,
  onFinish,
}: Config) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outOfTime, setOutOfTime] = useState(false);

  const [remainingMs, setRemainingMs] = useState(timeLimitMs);

  const dataRef = useRef<any>({});
  const startTimeRef = useRef<number>(0);

  // 🧠 CAMARA CENTRALIZADA
  const camera = useCameraCapture({
    enabled: started,
    delayMs: 5000,
  });

  // 🧠 START
  const start = () => {
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  // 🧠 TIMER VISUAL
  useEffect(() => {
    if (!started) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = timeLimitMs - elapsed;

      setRemainingMs(left > 0 ? left : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [started]);

  // 🧠 AUTO SUBMIT
  useEffect(() => {
    if (!started) return;

    const timer = setTimeout(() => {
      setOutOfTime(true);
      submit(dataRef.current, true);
    }, timeLimitMs);

    return () => clearTimeout(timer);
  }, [started]);

  // 🧠 AUTO SAVE
  useEffect(() => {
    if (!started) return;

    const interval = setInterval(async () => {
      if (!userId) return;

      await setDoc(
        doc(db, "test_progress", `${userId}_${testId}`),
        {
          userId,
          testId,
          data: dataRef.current,
          updatedAt: new Date(),
        },
        { merge: true },
      );
    }, autoSaveIntervalMs);

    return () => clearInterval(interval);
  }, [started]);

  const waitForCapture = async () => {
    let tries = 0;

    while (!camera.imageUrl && tries < 40) {
      await new Promise((r) => setTimeout(r, 250));
      tries++;
    }

    return camera.imageUrl;
  };

  // 🧠 SUBMIT
  const submit = async (payload: any, forcedOut = false) => {
    setLoading(true);

    const endTime = Date.now();

    // 💎 ESPERA REAL DE LA FOTO
    const capturaFinal = await waitForCapture();

    if (!capturaFinal) {
      console.warn("📸 No se pudo obtener la captura a tiempo");
    }

    const finalDataRaw = {
      ...payload,
      userId: String(userId),
      pacienteId: String(userId),
      testId,
      respuestas: payload.respuestas || [],
      score: payload.score ?? null,
      nivel: payload.nivel ?? null,
      metodo: payload.metodo ?? testId.toUpperCase(),
      archivoCaptura: payload.archivoCaptura || camera.imageUrl || null,
      captura_public_id: payload.captura_public_id || camera.publicId || null,
      tiempoTotalMs: endTime - startTimeRef.current,
      out_of_time: forcedOut,
      createdAt: new Date(),
    };

    const finalData = Object.fromEntries(
      Object.entries(finalDataRaw).filter(([, value]) => value !== undefined),
    );

    console.log("📦 FINAL DATA:", finalData); // 👈 debug hermoso

    await addDoc(collection(db, "resultados"), finalData);
console.log("FINAL DATA:", finalData);
    setLoading(false);
    onFinish(finalData);
  };

  const update = (partial: any) => {
    dataRef.current = {
      ...dataRef.current,
      ...partial,
    };
  };

  // 🧠 TIMER FORMATEADO
  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return {
    start,
    submit: (data: any) => submit(data, false),
    update,

    started,
    loading,
    outOfTime,

    minutes,
    seconds,

    // 💎 COMPONENTE DE CAMARA LISTO
    CameraComponent: camera.CameraComponent,
  };
}
