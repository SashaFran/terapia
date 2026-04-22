import { useEffect, useRef, useState } from "react";

interface Props {
  pacienteId: string | number;
  pacienteDni?: string;
  onCapturaTerminada: (url: string) => void;
}

export default function CapturaAutomatica({
  pacienteId,
  pacienteDni,
  onCapturaTerminada,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [videoListo, setVideoListo] = useState(false);

useEffect(() => {
  console.log("🧠 pacienteId recibido en Captura:", pacienteId);
}, [pacienteId]);
  useEffect(() => {
    console.log("🔥 CHECK pacienteId:", pacienteId, typeof pacienteId);
    const idSeguro =
      String(pacienteId)?.trim() ||
      (pacienteDni ? `DNI_${pacienteDni}` : "SIN_ID");

    console.log("🧠 ID FINAL:", idSeguro);

    const iniciarCamara = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        streamRef.current = stream;
        console.log("✅ Cámara iniciada para pacienteId:", pacienteId);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log("✅ Stream asignado al videoRef");
        }
      } catch (err) {
        console.error("❌ Error cámara:", err);
      }
    };

    iniciarCamara();

    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [pacienteId]);

  useEffect(() => {
    if (!videoListo || !streamRef.current) return;

    const timer = setTimeout(() => {
      tomarCapturaYSubir();
      console.log("⏰ Tiempo límite alcanzado, tomando captura automática");
    }, 10000);

    return () => clearTimeout(timer);
  }, [videoListo]);

  const tomarCapturaYSubir = async () => {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx?.drawImage(video, 0, 0);

    canvas.toBlob(async (blob) => {
      if (!blob) return;

      const formData = new FormData();
      formData.append("file", blob);
      formData.append("upload_preset", "joinsolution_bucket");

      // 💎 ID limpio SIEMPRE
      let idFinal =
        String(pacienteId)?.trim() ||
        (pacienteDni ? `DNI_${pacienteDni}` : "SIN_ID");

      const nombreArchivo = `captura_${idFinal}_${Date.now()}`;

      formData.append("public_id", nombreArchivo);
      formData.append("folder", "capturas_test");

      try {
        const res = await fetch(
          `https://api.cloudinary.com/v1_1/dni13rket/upload`,
          { method: "POST", body: formData }
        );

        const data = await res.json();

        if (data.secure_url) {
          console.log("✅ Captura OK:", nombreArchivo);
          onCapturaTerminada(data.secure_url);
        } else {
          console.error("❌ Cloudinary:", data);
        }
      } catch (err) {
        console.error("❌ Upload error:", err);
      }
    }, "image/jpeg", 0.9);
  };

  return (
    <video
      ref={videoRef}
      autoPlay
      muted
      playsInline
      style={{ width: "300px", border: "2px solid red" }}
      onCanPlay={() => {
  console.log("🎬 Video listo");
  setVideoListo(true);
}}
    />
  );
}