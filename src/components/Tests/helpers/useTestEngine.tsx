import { useEffect, useRef, useState } from "react";
import { db } from "../../../firebase/firebase";
import { doc, setDoc } from "firebase/firestore";
import { useCameraCapture } from "./useCameraCapture";
import Alert from "@mui/material/Alert";
import Button from "@mui/material/Button";

type Config = {
  userId: string | number;
  testId: string;
  timeLimitMs: number;
  autoSaveIntervalMs?: number;
  onFinish: (data: any) => void | Promise<void>;
  getResult?: () => any;
};

export function useTestEngine({
  userId,
  testId,
  timeLimitMs,
  autoSaveIntervalMs = 10000,
  onFinish,
  getResult,
}: Config) {
  const [started, setStarted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [outOfTime, setOutOfTime] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const [remainingMs, setRemainingMs] = useState(timeLimitMs);

  const dataRef = useRef<any>({});
  const startTimeRef = useRef<number>(0);
  const submittingRef = useRef(false);
  const completedRef = useRef(false);
  const pendingRef = useRef<any>(null);
  const onFinishRef = useRef(onFinish);
  const getResultRef = useRef(getResult);
  onFinishRef.current = onFinish;
  getResultRef.current = getResult;

  const camera = useCameraCapture({
    enabled: started,
    delayMs: 5000,
  });
  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const start = () => {
    if (startTimeRef.current) return;
    setStarted(true);
    startTimeRef.current = Date.now();
  };

  useEffect(() => {
    if (!started || loading || completed || error) return;

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current;
      const left = timeLimitMs - elapsed;

      setRemainingMs(left > 0 ? left : 0);
    }, 1000);

    return () => clearInterval(interval);
  }, [started, loading, completed, error, timeLimitMs]);

  useEffect(() => {
    if (!started || completed || loading || error) return;

    const timer = setTimeout(() => {
      setOutOfTime(true);
      setRemainingMs(0);
      void submit(getResultRef.current?.() ?? dataRef.current, true).catch(() => {});
    }, Math.max(0, timeLimitMs - (Date.now() - startTimeRef.current)));

    return () => clearTimeout(timer);
  }, [started, completed, loading, error, timeLimitMs]);

  useEffect(() => {
    if (!started || loading || completed || error) return;

    const interval = setInterval(async () => {
      if (!userId) return;

      await setDoc(
        doc(db, "test_progress", `${userId}_${testId}`),
        {
          userId,
          testId,
          data: getResultRef.current?.() ?? dataRef.current,
          updatedAt: new Date(),
        },
        { merge: true },
      ).catch((error) => console.error("No se pudo guardar el progreso", error));
    }, autoSaveIntervalMs);

    return () => clearInterval(interval);
  }, [started, loading, completed, error, userId, testId, autoSaveIntervalMs]);

  const waitForCapture = async () => {
    let tries = 0;

    while (!cameraRef.current.imageUrl && tries < 40) {
      await new Promise((r) => setTimeout(r, 250));
      tries++;
    }

    return cameraRef.current.imageUrl;
  };

  const submit = async (payload: any, forcedOut = false) => {
    if (submittingRef.current || completedRef.current || !startTimeRef.current) return;
    submittingRef.current = true;
    setLoading(true);
    setError(false);

    const endTime = Date.now();

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
      archivoCaptura: payload.archivoCaptura || capturaFinal || null,
      captura_public_id: payload.captura_public_id || cameraRef.current.publicId || null,
      tiempoTotalMs: Math.min(timeLimitMs, Math.max(0, endTime - startTimeRef.current)),
      out_of_time: forcedOut || endTime - startTimeRef.current >= timeLimitMs,
      createdAt: new Date(),
    };

    const finalData = pendingRef.current ?? Object.fromEntries(
      Object.entries(finalDataRaw).filter(([, value]) => value !== undefined),
    );


    pendingRef.current = finalData;
    try {
      await onFinishRef.current(finalData);
      completedRef.current = true;
      setCompleted(true);
    } catch (error) {
      setError(true);
      throw error;
    } finally {
      setLoading(false);
      submittingRef.current = false;
    }
  };

  const update = (partial: any) => {
    dataRef.current = {
      ...dataRef.current,
      ...partial,
    };
  };

  const minutes = Math.floor(remainingMs / 60000);
  const seconds = Math.floor((remainingMs % 60000) / 1000);

  return {
    start,
    submit: (data: any) => submit(data, false),
    update,

    started,
    loading,
    outOfTime,
    inputLocked: loading || error || completed || outOfTime,
    feedback: error ? (
      <Alert severity="error" role="alert" action={
        <Button color="inherit" onClick={() => void submit(pendingRef.current).catch(() => {})}>Reintentar</Button>
      }>No se pudo guardar la evaluación. Sus respuestas se conservan en esta pantalla. Reintente antes de salir.</Alert>
    ) : loading ? (
      <Alert severity="info" role="status">Guardando evaluación. Espere antes de cerrar esta página.</Alert>
    ) : started && !completed && remainingMs > 0 && remainingMs <= 300000 ? (
      <Alert severity="warning" role="alert" sx={{ position: "sticky", top: 0, zIndex: 5, my: 1 }}>
        Quedan 5 minutos o menos para finalizar la evaluación. Al agotarse el tiempo, el test se cerrará automáticamente y se enviarán las respuestas registradas.
      </Alert>
    ) : null,

    minutes,
    seconds,

    CameraComponent: camera.CameraComponent,
  };
}
