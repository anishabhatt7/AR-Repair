let currentStream = null;

export async function startCamera(videoElement) {
  if (currentStream) {
    stopCamera(videoElement);
  }

  const constraints = {
    video: {
      facingMode: { ideal: 'environment' },
      width: { ideal: 1280 },
      height: { ideal: 720 }
    },
    audio: false
  };

  try {
    currentStream = await navigator.mediaDevices.getUserMedia(constraints);
  } catch (err) {
    if (err.name === 'OverconstrainedError') {
      currentStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } else {
      throw err;
    }
  }

  videoElement.srcObject = currentStream;
  await videoElement.play();
}

export function stopCamera(videoElement) {
  if (currentStream) {
    currentStream.getTracks().forEach(track => track.stop());
    currentStream = null;
  }
  videoElement.srcObject = null;
}

export function captureFrame(videoElement) {
  const vw = videoElement.videoWidth || 640;
  const vh = videoElement.videoHeight || 480;

  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 768;
  const ctx = canvas.getContext('2d');

  const videoAspect = vw / vh;
  const canvasAspect = canvas.width / canvas.height;

  let sx = 0, sy = 0, sw = vw, sh = vh;

  if (videoAspect > canvasAspect) {
    sw = vh * canvasAspect;
    sx = (vw - sw) / 2;
  } else {
    sh = vw / canvasAspect;
    sy = (vh - sh) / 2;
  }

  ctx.drawImage(videoElement, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.75);
}

export function isCameraSupported() {
  return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
