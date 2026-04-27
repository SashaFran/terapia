import { useEffect, useRef } from "react";

export default function CapturaAutomatica({
  pacienteId,
  onCapturaTerminada,
}: {
  pacienteId: string | number;
  onCapturaTerminada: (data: any) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

useEffect(() => {
  let timeout: any;
  let interval: any;
  const yaCapturo = { current: false };

  const iniciar = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) return;

      video.srcObject = stream;
      await video.play();

      console.log("📸 cámara lista");

      interval = setInterval(() => {
        const v = videoRef.current;

        if (!v) return;

        if (v.videoWidth > 0 && v.videoHeight > 0) {
          clearInterval(interval);

          timeout = setTimeout(() => {
            if (yaCapturo.current) return;
            yaCapturo.current = true;

            console.log("📸 capturando UNA SOLA VEZ");

            capturar();
          }, 5000);
        }
      }, 200);

    } catch (err) {
      console.error("Error cámara:", err);
    }
  };

  iniciar();

  return () => {
    if (timeout) clearTimeout(timeout);
    if (interval) clearInterval(interval);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };
}, []);

const hasCaptured = useRef(false);

const capturar = async () => {
  if (hasCaptured.current) return;
  hasCaptured.current = true;
  const video = videoRef.current;
  if (!video) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx?.drawImage(video, 0, 0);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png")
  );

  if (!blob) return;

  const formData = new FormData();
  formData.append("file", blob);
  formData.append("upload_preset", "joinsolution_bucket");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dni13rket/image/upload",
    {
      method: "POST",
      body: formData,
    }
  );

  const data = await res.json();

  console.log("📤 subida directa:", data);

  onCapturaTerminada({
    url: data.secure_url,
    public_id: data.public_id,
  });
  
};

  return (
    <video
      ref={videoRef}
      style={{ width: 1, height: 1, opacity: 0, position: "absolute" }}
      playsInline
      muted
    />
  );
}
