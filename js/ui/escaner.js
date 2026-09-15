// Escáner de códigos de barras.
//
// Safari no incluye BarcodeDetector, así que hay dos caminos: el detector
// nativo donde exista (Chrome) y ZXing cargado desde CDN en el resto, que es
// el caso del iPhone. La entrada manual del código queda siempre disponible
// como salida de emergencia.

const FORMATOS = ["ean_13", "ean_8", "upc_a", "upc_e"];

let parar = null;

export function detener() {
  if (parar) {
    parar();
    parar = null;
  }
}

async function nativoDisponible() {
  if (!("BarcodeDetector" in window)) return false;
  try {
    const admitidos = await window.BarcodeDetector.getSupportedFormats();
    return FORMATOS.some((f) => admitidos.includes(f));
  } catch {
    return false;
  }
}

// Devuelve el código leído, o null si se cancela.
export async function escanear(video) {
  detener();
  const flujo = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: { ideal: "environment" } },
    audio: false
  });

  video.srcObject = flujo;
  video.setAttribute("playsinline", "");
  video.muted = true;
  await video.play();

  const cerrar = () => flujo.getTracks().forEach((p) => p.stop());

  if (await nativoDisponible()) {
    return leerConNativo(video, cerrar);
  }
  return leerConZxing(video, cerrar);
}

function leerConNativo(video, cerrar) {
  const detector = new window.BarcodeDetector({ formats: FORMATOS });
  return new Promise((resolver) => {
    let vivo = true;
    parar = () => {
      vivo = false;
      cerrar();
      resolver(null);
    };

    const tic = async () => {
      if (!vivo) return;
      try {
        const marcas = await detector.detect(video);
        if (marcas.length) {
          vivo = false;
          cerrar();
          parar = null;
          resolver(marcas[0].rawValue);
          return;
        }
      } catch {
        // Un fotograma ilegible no es un error: se prueba con el siguiente.
      }
      requestAnimationFrame(tic);
    };
    tic();
  });
}

async function leerConZxing(video, cerrar) {
  const { BrowserMultiFormatReader } = await import(
    "https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/+esm"
  );
  const lector = new BrowserMultiFormatReader();

  return new Promise((resolver) => {
    let resuelto = false;

    parar = () => {
      if (resuelto) return;
      resuelto = true;
      lector.reset();
      cerrar();
      resolver(null);
    };

    lector.decodeFromVideoElement(video, (resultado) => {
      if (resultado && !resuelto) {
        resuelto = true;
        lector.reset();
        cerrar();
        parar = null;
        resolver(resultado.getText());
      }
    });
  });
}
