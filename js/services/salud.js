// Puente con Apple Salud.
//
// Una PWA no puede leer HealthKit. El camino es una automatización de Atajos en
// el iPhone que, al terminar un entrenamiento, envía los datos al Worker; allí
// quedan en un buzón y la app los recoge al abrirse. Atajos nunca toca Firestore.

import { WORKER } from "../config.js";
import { token } from "../data/firebase.js";

// Nombres de Apple -> nombres nuestros.
const TRADUCCION = {
  "Functional Strength Training": "Crossfit",
  "High Intensity Interval Training": "Crossfit",
  "Traditional Strength Training": "Fuerza",
  Running: "Correr",
  Walking: "Caminar",
  Cycling: "Bici",
  Tennis: "Pádel",
  Padel: "Pádel",
  Swimming: "Natación"
};

export async function recoger() {
  if (!WORKER) return [];
  const credencial = await token();
  if (!credencial) return [];

  const respuesta = await fetch(`${WORKER}/salud`, {
    headers: { Authorization: `Bearer ${credencial}` }
  });
  if (!respuesta.ok) return [];

  const datos = await respuesta.json().catch(() => null);
  if (!datos || !Array.isArray(datos.sesiones)) return [];

  return datos.sesiones.map(({ clave, datos: d }) => ({
    clave,
    entreno: {
      tipo: "actividad",
      origen: "salud",
      actividad: TRADUCCION[d.actividad] || d.actividad || "Actividad",
      duracion: Math.round(Number(d.duracion) || 0),
      energia: Number(d.energia) || null,
      fcMedia: Number(d.fc) || null,
      fecha: d.fecha,
      hora: d.hora || ""
    }
  }));
}

// Solo se borra del buzón lo que ya está escrito en Firestore. Si la escritura
// falla a medias, el entreno sigue ahí y se recupera la próxima vez.
export async function confirmar(claves) {
  if (!claves.length || !WORKER) return;
  const credencial = await token();
  await fetch(`${WORKER}/salud/limpiar`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${credencial}`
    },
    body: JSON.stringify({ claves })
  });
}
