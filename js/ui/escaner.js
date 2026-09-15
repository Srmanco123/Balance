// Lectura de códigos de barras.
//
// Dos caminos, porque en iPhone el escaneo en vivo es frágil:
//  - En vivo: detector nativo donde exista (Chrome) y ZXing en el resto.
//  - Por foto: la cámara del sistema enfoca y dispara a resolución completa,
//    que es justo lo que necesita un EAN. Es la vía fiable en iOS.

const FORMATOS_NATIVOS = ["ean_13", "ean_8", "upc_a", "upc_e"];

let parar = null;
let lectorCache = null;

export function detener() {
  if (parar) {
    parar();
    parar = null;
  }
}

async function lector() {
  if (lectorCache) return lectorCache;
  const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
    import("https://cdn.jsdelivr.net/npm/@zxing/browser@0.1.5/+esm"),
    import("https://cdn.jsdelivr.net/npm/@zxing/library@0.21.3/+esm")
  ]);

  // Acotar los formatos acelera mucho la detección y evita falsos positivos.
  const pistas = new Map();
  pistas.set(DecodeHintType.POSSIBLE_FORMATS, [
    BarcodeFormat.EAN_13,
    BarcodeFormat.EAN_8,
    BarcodeFormat.UPC_A,
    BarcodeFormat.UPC_E
  ]);
  pistas.set(DecodeHintType.TRY_HARDER, true);

  lectorCache = new BrowserMultiFormatReader(pistas);
  return lectorCache;
}

async function nativoDisponible() {
  if (!("BarcodeDetector" in window)) return false;
  try {
    const admitidos = await window.BarcodeDetector.getSupportedFormats();
    return FORMATOS_NATIVOS.some((f) => admitidos.includes(f));
  } catch {
    return false;
  }
}

export async function escanear(video, alEstado = () => {}) {
  detener();

  // Resolución alta y enfoque continuo: un código de barras a 15 cm necesita
  // ambas cosas. Con 640×480 y enfoque fijo no hay manera.
  const flujo = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode: { ideal: "environment" },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
      advanced: [{ focusMode: "continuous" }]
    },
    audio: false
  });

  video.srcObject = flujo;
  video.setAttribute("playsinline", "");
  video.muted = true;
  await video.play();

  const pista = flujo.getVideoTracks()[0];
  const ajustes = pista.getSettings();
  alEstado(`Buscando código… (${ajustes.width}×${ajustes.height})`);

  const cerrar = () => flujo.getTracks().forEach((p) => p.stop());

  if (await nativoDisponible()) return conNativo(video, cerrar);
  return conZxing(video, cerrar, alEstado);
}

function conNativo(video, cerrar) {
  const detector = new window.BarcodeDetector({ formats: FORMATOS_NATIVOS });
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
        // Fotograma ilegible: se prueba con el siguiente.
      }
      requestAnimationFrame(tic);
    };
    tic();
  });
}

async function conZxing(video, cerrar, alEstado) {
  let lec;
  try {
    lec = await lector();
  } catch {
    cerrar();
    throw new Error("No se ha podido cargar el lector. Prueba con la foto del código.");
  }

  return new Promise((resolver) => {
    let resuelto = false;
    let controles = null;

    const terminar = (valor) => {
      if (resuelto) return;
      resuelto = true;
      try {
        if (controles) controles.stop();
      } catch {
        /* el lector ya estaba parado */
      }
      cerrar();
      parar = null;
      resolver(valor);
    };

    parar = () => terminar(null);

    lec
      .decodeFromVideoElement(video, (resultado) => {
        if (resultado) terminar(resultado.getText());
      })
      .then((c) => {
        controles = c;
      })
      .catch(() => {
        alEstado("El lector ha fallado. Usa la foto del código.");
        terminar(null);
      });
  });
}

// Vía fiable en iPhone: la foto del sistema, a resolución completa y enfocada.
export async function leerDeFoto(archivo) {
  const lec = await lector();
  const url = URL.createObjectURL(archivo);
  try {
    const resultado = await lec.decodeFromImageUrl(url);
    return resultado.getText();
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
