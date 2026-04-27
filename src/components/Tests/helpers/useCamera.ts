import { useEffect, useRef, useState, Fragment } from "react";
import React from "react";
import { jsx as _jsx } from "react/jsx-runtime";

export function useCamera({ enabled }: { enabled: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const start = async () => {
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

      setReady(true);
    };

    start();

    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [enabled]);

  const CameraComponent = () =>
    React.createElement("video", {
      ref: videoRef,
      style: { display: "none" },
      muted: true,
      playsInline: true,
    });

  return {
    CameraComponent,
    videoRef,
    ready,
  };
}