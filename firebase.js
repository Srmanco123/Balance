// ÚNICO módulo que conoce Firebase. Si algún día se cambia de base de datos,
// solo se toca este archivo.

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-app.js";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/11.0.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";

import { firebaseConfig } from "../config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
export const db = getFirestore(app);

const proveedor = new GoogleAuthProvider();

export function alCambiarSesion(callback) {
  return onAuthStateChanged(auth, callback);
}

// En iOS instalado, la ventana emergente a veces no está disponible.
// Si falla, se cae a redirección.
export async function entrar() {
  try {
    await signInWithPopup(auth, proveedor);
  } catch (error) {
    const recuperables = [
      "auth/popup-blocked",
      "auth/popup-closed-by-user",
      "auth/operation-not-supported-in-this-environment",
      "auth/cancelled-popup-request"
    ];
    if (recuperables.includes(error.code)) {
      await signInWithRedirect(auth, proveedor);
      return;
    }
    throw error;
  }
}

export function salir() {
  return signOut(auth);
}

export function resultadoRedireccion() {
  return getRedirectResult(auth);
}

export function usuario() {
  return auth.currentUser;
}

// El Worker necesita este token en cada petición.
export function token() {
  return auth.currentUser ? auth.currentUser.getIdToken() : Promise.resolve(null);
}
