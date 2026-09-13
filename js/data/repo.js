// Único punto de acceso a datos. Ningún otro módulo importa Firestore.

import {
  doc,
  getDoc,
  setDoc,
  collection,
  query,
  orderBy,
  limit,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

import { db } from "./firebase.js";

const ESQUEMA = 1;

export async function leerPerfil(uid) {
  const captura = await getDoc(doc(db, "usuarios", uid, "config", "perfil"));
  return captura.exists() ? captura.data() : null;
}

export async function guardarPerfil(uid, perfil) {
  await setDoc(
    doc(db, "usuarios", uid, "config", "perfil"),
    { ...perfil, v: ESQUEMA, actualizado: serverTimestamp() },
    { merge: true }
  );
}

// ---------- Pesos ----------
// El identificador del documento es la fecha local: registrar dos veces el
// mismo día corrige el dato en lugar de duplicarlo.

export async function guardarPeso(uid, fecha, kg) {
  await setDoc(doc(db, "usuarios", uid, "pesos", fecha), {
    kg,
    fecha,
    v: ESQUEMA,
    registrado: serverTimestamp()
  });
}

export async function leerPesos(uid, cuantos = 60) {
  const consulta = query(
    collection(db, "usuarios", uid, "pesos"),
    orderBy("fecha", "desc"),
    limit(cuantos)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => d.data()).reverse();
}
