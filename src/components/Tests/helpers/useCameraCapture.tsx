import { useEffect, useRef, useState } from "react";

export function useCameraCapture({
  enabled,
  delayMs = 5000,
}: {
  enabled: boolean;
  delayMs?: number;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [publicId, setPublicId] = useState<string | null>(null);

  const hasCaptured = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    let timeout: any;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });

        streamRef.current = stream;

        const video = videoRef.current;
        if (!video) return;

        video.srcObject = stream;

        await new Promise<void>((resolve) => {
          video.onloadedmetadata = () => resolve();
        });

        await video.play();

        timeout = setTimeout(async () => {
          if (hasCaptured.current) return;
          hasCaptured.current = true;

          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");

          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          ctx?.drawImage(video, 0, 0);

          const blob = await new Promise<Blob | null>((res) =>
            canvas.toBlob(res, "image/png")
          );

          if (!blob) return;

          const form = new FormData();
          form.append("file", blob);
          form.append("upload_preset", "joinsolution_bucket");

          const resCloud = await fetch(
            "https://api.cloudinary.com/v1_1/dni13rket/image/upload",
            {
              method: "POST",
              body: form,
            }
          );

          const data = await resCloud.json();

          console.log("📸 CAPTURA OK:", data);

          setImageUrl(data.secure_url);
          setPublicId(data.public_id);
        }, delayMs);
      } catch (err) {
        console.error("❌ error cámara:", err);
      }
    };

    start();

    return () => {
      if (timeout) clearTimeout(timeout);
      hasCaptured.current = false;

      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled, delayMs]);

  const CameraComponent = () => (
    <video
      ref={videoRef}
      style={{ display: "none" }}
      muted
      playsInline
    />
  );

  return {
  imageUrl,
  publicId,
  CameraComponent
};
}