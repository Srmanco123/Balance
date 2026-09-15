import { WORKER } from "../config.js";
import { token } from "../data/firebase.js";

// Reducir antes de enviar no es solo ahorro: una foto de 4000 px no mejora la
// estimación y multiplica el coste y el tiempo de subida.
const LADO_MAXIMO = 512;

export function reducir(archivo) {
  return new Promise((resolver, rechazar) => {
    const lector = new FileReader();
    lector.onerror = () => rechazar(new Error("No se ha podido leer la imagen"));
    lector.onload = () => {
      const imagen = new Image();
      imagen.onerror = () => rechazar(new Error("Formato de imagen no admitido"));
      imagen.onload = () => {
        const escala = Math.min(1, LADO_MAXIMO / Math.max(imagen.width, imagen.height));
        const lienzo = document.createElement("canvas");
        lienzo.width = Math.round(imagen.width * escala);
        lienzo.height = Math.round(imagen.height * escala);
        lienzo.getContext("2d").drawImage(imagen, 0, 0, lienzo.width, lienzo.height);
        const url = lienzo.toDataURL("image/jpeg", 0.8);
        resolver({ base64: url.split(",")[1], miniatura: url });
      };
      imagen.src = lector.result;
    };
    lector.readAsDataURL(archivo);
  });
}

export async function analizar(archivo, nota) {
  if (!WORKER) throw new Error("Falta configurar la dirección del Worker");

  const { base64, miniatura } = await reducir(archivo);
  const credencial = await token();
  if (!credencial) throw new Error("Sesión caducada, vuelve a entrar");

  const respuesta = await fetch(`${WORKER}/vision`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credencial}`
    },
    body: JSON.stringify({ imagen: base64, tipo: "image/jpeg", nota: nota || "" })
  });

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 429) throw new Error("Límite diario de análisis alcanzado");
    if (respuesta.status === 401) throw new Error("El Worker no ha aceptado tu sesión");
    throw new Error((datos && datos.error) || "El análisis ha fallado");
  }

  return { items: datos.items, nota: datos.nota || "", miniatura };
}

// Los macros de un ingrediente se guardan para SUS gramos. Al cambiar la
// cantidad hay que reescalar desde la proporción original.
export function reescalar(item, gramosNuevos) {
  const factor = gramosNuevos / (item.gramos || 1);
  const red = (v) => Math.round((v || 0) * factor * 10) / 10;
  return {
    ...item,
    gramos: gramosNuevos,
    kcal: Math.round((item.kcal || 0) * factor),
    proteina: red(item.proteina),
    hidratos: red(item.hidratos),
    grasa: red(item.grasa)
  };
}

export function sumar(items) {
  return items.reduce(
    (a, i) => ({
      kcal: a.kcal + (i.kcal || 0),
      proteina: Math.round((a.proteina + (i.proteina || 0)) * 10) / 10,
      hidratos: Math.round((a.hidratos + (i.hidratos || 0)) * 10) / 10,
      grasa: Math.round((a.grasa + (i.grasa || 0)) * 10) / 10
    }),
    { kcal: 0, proteina: 0, hidratos: 0, grasa: 0 }
  );
}
