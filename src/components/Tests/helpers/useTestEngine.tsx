
import {
  accessAction,
  accessStore,
  abandonPatientTest,
  beginPatientTest,
  hasPatientAccess,
  isMasterPatient,
} from "../../../utils/patientAccess";

import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import { db } from "../../../firebase/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  onRestore?: (data: any) => void;
};

export function useTestEngine({
  userId,
  testId,
  timeLimitMs,
  autoSaveIntervalMs = 10000,
  onFinish,
  getResult,
  onRestore,
}: Config) {
  const access = useSyncExternalStore(
    accessStore.subscribe,
    accessStore.snapshot,
  );

  const masterTestActive =
    access.active &&
    access.master &&
    access.testId === testId;

  const [started, setStarted] = useState(false);
  const [restoring, setRestoring] = useState(masterTestActive);
  const [loading, setLoading] = useState(false);
  const [outOfTime, setOutOfTime] = useState(false);
  const [error, setError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [remainingMs, setRemainingMs] = useState(timeLimitMs);

  const dataRef = useRef<any>({});
  const startTimeRef = useRef(0);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const restoringRef = useRef(false);
  const restoredRef = useRef(false);
  const submittingRef = useRef(false);
  const completedRef = useRef(false);
  const pendingRef = useRef<any>(null);

  const onFinishRef = useRef(onFinish);
  const getResultRef = useRef(getResult);
  const onRestoreRef = useRef(onRestore);

  onFinishRef.current = onFinish;
  getResultRef.current = getResult;
  onRestoreRef.current = onRestore;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const camera = useCameraCapture({
    enabled: started && !restoring,
    delayMs: 5000,
  });

  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  // Recuperar exclusivamente una evaluación maestra activa.
  useEffect(() => {
    if (!masterTestActive) return;
    if (restoredRef.current || restoringRef.current) return;
    if (!userId) return;

    restoringRef.current = true;
    setRestoring(true);

    const restore = async () => {
      try {
        const reference = doc(
          db,
          "test_progress",
          `${userId}_${testId}`,
        );

        const snapshot = await getDoc(reference);

        if (!mountedRef.current) return;

        const saved = snapshot.exists()
          ? snapshot.data().data
          : null;

        if (
          saved &&
          typeof saved === "object" &&
          !Array.isArray(saved)
        ) {
          const { __engineStartMs, ...answers } = saved;

          dataRef.current = answers;

          if (
            typeof __engineStartMs === "number" &&
            Number.isFinite(__engineStartMs) &&
            __engineStartMs > 0
          ) {
            startTimeRef.current =
              typeof access.inicioTestMs === "number" &&
              access.inicioTestMs > 0
                ? access.inicioTestMs
                : __engineStartMs;
          }

          onRestoreRef.current?.(answers);
        }

        // Para progreso anterior que no contiene fecha,
        // todavía no existe un inicio recuperable.
        if (!startTimeRef.current) {
          startTimeRef.current = typeof access.inicioTestMs === "number" && access.inicioTestMs > 0 && access.master ? access.inicioTestMs : Date.now();
        }

        const left = Math.max(
          0,
          timeLimitMs -
            (Date.now() - startTimeRef.current),
        );

        setRemainingMs(left);
        restoredRef.current = true;
        setRestoring(false);
        setStarted(true);
      } catch (err) {
        console.error(
          "No se pudo recuperar la evaluación:",
          err,
        );

        if (mountedRef.current) {
          setError(true);
          setRestoring(false);
        }
      } finally {
        restoringRef.current = false;
      }
    };

    void restore();
  }, [masterTestActive, userId, testId, timeLimitMs]);

  const start = async () => {
    if (
      startTimeRef.current ||
      startingRef.current ||
      restoring ||
      restoringRef.current
    ) {
      return;
    }

    startingRef.current = true;

    try {
      if (hasPatientAccess()) {
        await beginPatientTest(testId);

        if (!mountedRef.current) {
          if (!isMasterPatient()) {
            await abandonPatientTest(testId);
          }
          return;
        }
      }

      if (!mountedRef.current) return;

      startTimeRef.current = typeof access.inicioTestMs === "number" && access.inicioTestMs > 0 && access.master ? access.inicioTestMs : Date.now();
      setRemainingMs(timeLimitMs);
      setStarted(true);
    } finally {
      startingRef.current = false;
    }
  };

  // Cronómetro.
  useEffect(() => {
    if (
      !started ||
      restoring ||
      loading ||
      completed ||
      error ||
      !startTimeRef.current
    ) {
      return;
    }

    const tick = () => {
      const elapsed =
        Date.now() - startTimeRef.current;

      setRemainingMs(
        Math.max(0, timeLimitMs - elapsed),
      );
    };

    tick();

    const interval = window.setInterval(tick, 1000);

    return () => window.clearInterval(interval);
  }, [
    started,
    restoring,
    loading,
    completed,
    error,
    timeLimitMs,
  ]);

  // Finalización automática.
  useEffect(() => {
    if (
      !started ||
      restoring ||
      completed ||
      loading ||
      error ||
      !startTimeRef.current
    ) {
      return;
    }

    const left = Math.max(
      0,
      timeLimitMs -
        (Date.now() - startTimeRef.current),
    );

    const timer = window.setTimeout(() => {
      setOutOfTime(true);
      setRemainingMs(0);

      void submit(
        getResultRef.current?.() ?? dataRef.current,
        true,
      ).catch((err) => {
        console.error(
          "Error al finalizar por tiempo:",
          err,
        );
      });
    }, left);

    return () => window.clearTimeout(timer);
  }, [
    started,
    restoring,
    completed,
    loading,
    error,
    timeLimitMs,
  ]);

  // Guardado automático.
  useEffect(() => {
    if (
      !started ||
      restoring ||
      loading ||
      completed ||
      error
    ) {
      return;
    }

    const save = async () => {
      if (!userId || !startTimeRef.current) return;

      const result =
        getResultRef.current?.() ??
        dataRef.current;

      const progreso = {
        ...(result &&
        typeof result === "object" &&
        !Array.isArray(result)
          ? result
          : { respuestas: result }),
        __engineStartMs: startTimeRef.current,
      };

      try {
        if (hasPatientAccess()) {
          await accessAction("guardarProgreso", {
            testId,
            progreso,
          });
        } else {
          await setDoc(
            doc(
              db,
              "test_progress",
              `${userId}_${testId}`,
            ),
            {
              userId,
              testId,
              data: progreso,
              updatedAt: new Date(),
            },
            { merge: true },
          );
        }
      } catch (err) {
        console.error(
          "No se pudo guardar el progreso:",
          err,
        );
      }
    };

    const interval = window.setInterval(
      () => void save(),
      autoSaveIntervalMs,
    );

    return () => window.clearInterval(interval);
  }, [
    started,
    restoring,
    loading,
    completed,
    error,
    userId,
    testId,
    autoSaveIntervalMs,
  ]);

  const waitForCapture = async () => {
    let tries = 0;

    while (
      !cameraRef.current.imageUrl &&
      tries < 40
    ) {
      await new Promise((resolve) =>
        setTimeout(resolve, 250),
      );

      tries++;
    }

    return cameraRef.current.imageUrl;
  };

  const submit = async (
    payload: any,
    forcedOut = false,
  ) => {
    if (
      submittingRef.current ||
      completedRef.current ||
      !startTimeRef.current ||
      restoring
    ) {
      return;
    }

    submittingRef.current = true;
    setLoading(true);
    setError(false);

    const endTime = Date.now();

    try {
      const capturaFinal =
        await waitForCapture();

      const safePayload = payload ?? {};

      const finalDataRaw = {
        ...safePayload,
        userId: String(userId),
        pacienteId: String(userId),
        testId,
        respuestas:
          safePayload.respuestas || [],
        score: safePayload.score ?? null,
        nivel: safePayload.nivel ?? null,
        metodo:
          safePayload.metodo ??
          testId.toUpperCase(),
        archivoCaptura:
          safePayload.archivoCaptura ||
          capturaFinal ||
          null,
        captura_public_id:
          safePayload.captura_public_id ||
          cameraRef.current.publicId ||
          null,
        tiempoTotalMs: Math.min(
          timeLimitMs,
          Math.max(
            0,
            endTime - startTimeRef.current,
          ),
        ),
        out_of_time:
          forcedOut ||
          endTime -
            startTimeRef.current >=
            timeLimitMs,
        createdAt: new Date(),
      };

      const finalData =
        pendingRef.current ??
        Object.fromEntries(
          Object.entries(finalDataRaw).filter(
            ([, value]) =>
              value !== undefined,
          ),
        );

      pendingRef.current = finalData;

      await onFinishRef.current(finalData);

      completedRef.current = true;
      setCompleted(true);
    } catch (err) {
      setError(true);
      throw err;
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

  const minutes = Math.floor(
    remainingMs / 60000,
  );

  const seconds = Math.floor(
    (remainingMs % 60000) / 1000,
  );

  return {
    start,
    submit: (data: any) =>
      submit(data, false),
    update,

    started,
    restoring,
    loading,
    outOfTime,

    inputLocked:
      restoring ||
      loading ||
      error ||
      completed ||
      outOfTime,

    feedback: restoring ? (
      <Alert severity="info" role="status">
        Recuperando la evaluación y sus
        respuestas guardadas...
      </Alert>
    ) : error ? (
      <Alert
        severity="error"
        role="alert"
        action={
          pendingRef.current ? (
            <Button
              color="inherit"
              onClick={() =>
                void submit(
                  pendingRef.current,
                ).catch(() => {})
              }
            >
              Reintentar
            </Button>
          ) : undefined
        }
      >
        No se pudo recuperar o guardar
        la evaluación. No actualice la
        página hasta resolver el problema.
      </Alert>
    ) : loading ? (
      <Alert severity="info" role="status">
        Guardando evaluación. Espere
        antes de cerrar esta página.
      </Alert>
    ) : started &&
      !completed &&
      remainingMs > 0 &&
      remainingMs <= 300000 ? (
      <Alert
        severity="warning"
        role="alert"
        sx={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          my: 1,
        }}
      >
        Quedan 5 minutos o menos para
        finalizar la evaluación.
      </Alert>
    ) : null,

    minutes,
    seconds,

    CameraComponent:
      camera.CameraComponent,
  };
}

