// Prueba de cámara: el punto donde iOS suele dar sorpresas.
// Se comprueba aquí, con la app vacía, antes de que haya lógica que depurar.

let flujo = null;

export async function abrir(video) {
  cerrar();
  flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });
  video.srcObject = flujo;
  video.setAttribute("playsinline", "");
  video.muted = true;
  await video.play();
  const pista = flujo.getVideoTracks()[0];
  const ajustes = pista.getSettings();
  return `${ajustes.width}×${ajustes.height}, ${pista.label || "cámara sin nombre"}`;
}

export function cerrar() {
  if (!flujo) return;
  flujo.getTracks().forEach((p) => p.stop());
  flujo = null;
}
