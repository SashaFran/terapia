// Definimos un tipo para la función de limpieza
type CleanupFunction = () => void;

let stream: MediaStream | null = null;

export const iniciarMonitoreo = async (
  userId: string | number, 
  intervaloMs: number = 120000
): Promise<CleanupFunction | undefined> => {
  try {
    // 1. Pedimos acceso a la cámara
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: 640, height: 480 }
    });

    // 2. Creamos el elemento de video en memoria
    const videoElement = document.createElement('video');
    videoElement.srcObject = stream;
    
    // Necesario para que funcione en algunos navegadores móviles
    videoElement.muted = true;
    videoElement.setAttribute("playsinline", "true");
    
    await videoElement.play();

    // 3. Configuramos el intervalo
    const timer = setInterval(() => {
      capturarYSubir(videoElement, userId);
    }, intervaloMs);

    // Retornamos la función de limpieza
    return () => {
      clearInterval(timer);
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    };
  } catch (err) {
    console.error("Error al acceder a la cámara:", err);
    alert("Es obligatorio el acceso a la cámara para realizar el test.");
    return undefined;
  }
};

const capturarYSubir = (video: HTMLVideoElement, userId: string | number): void => {
  const canvas = document.createElement('canvas');
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.drawImage(video, 0, 0);

  // Convertimos a Blob con calidad 0.5
  canvas.toBlob(
    (blob) => {
      if (blob) {
        enviarAlServidor(blob, userId);
      }
    },
    'image/jpeg',
    0.5
  );
};

const enviarAlServidor = async (blob: Blob, userId: string | number): Promise<void> => {
  const formData = new FormData();
  // El tercer argumento es el nombre del archivo
  formData.append('foto', blob, `identidad_${userId}_${Date.now()}.jpg`);
  formData.append('userId', userId.toString());

  try {
    const response = await fetch('/api/upload-capture', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Error en la respuesta del servidor');
    }
  } catch (e) {
    console.error("Fallo en la subida silenciosa:", e);
  }
};

export default iniciarMonitoreo;
