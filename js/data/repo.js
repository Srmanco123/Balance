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
  addDoc,
  deleteDoc,
  where,
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

// ---------- Productos (caché de Open Food Facts) ----------
// Un código escaneado no se vuelve a pedir a la red nunca más.

export async function leerProducto(uid, ean) {
  const captura = await getDoc(doc(db, "usuarios", uid, "productos", ean));
  return captura.exists() ? captura.data() : null;
}

export async function guardarProducto(uid, producto) {
  await setDoc(doc(db, "usuarios", uid, "productos", producto.ean), {
    ...producto,
    v: ESQUEMA,
    guardado: serverTimestamp()
  });
}

// ---------- Entradas de comida ----------
// Cada entrada guarda una COPIA de los macros, nunca una referencia: editar un
// producto o una receta no debe alterar lo que ya está registrado.

export async function guardarEntrada(uid, entrada) {
  return addDoc(collection(db, "usuarios", uid, "entradas"), {
    ...entrada,
    v: ESQUEMA,
    ts: serverTimestamp()
  });
}

export async function leerEntradasDelDia(uid, fecha) {
  const consulta = query(
    collection(db, "usuarios", uid, "entradas"),
    where("fecha", "==", fecha)
  );
  const captura = await getDocs(consulta);
  return captura.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
}

export async function borrarEntrada(uid, id) {
  await deleteDoc(doc(db, "usuarios", uid, "entradas", id));
}
