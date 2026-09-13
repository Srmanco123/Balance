// Único punto de acceso a datos. Ningún otro módulo importa Firestore.

import {
  doc,
  getDoc,
  setDoc,
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
