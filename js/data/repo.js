// Único punto de acceso a datos. Ningún otro módulo importa Firestore.
//
// CAMBIO DE LA v2: la raíz ya no es usuarios/{uid} sino
// consultas/{consultaId}/pacientes/{pacienteId}. El primer argumento de las
// funciones antiguas ya no es el uid, es el SUJETO (el paciente al que se le
// están leyendo o escribiendo los datos). La firma se mantiene para no tocar
// las vistas: basta sustituir usuario().uid por sujeto().

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
import { contexto } from "./sesion.js";

const ESQUEMA = 2;

// ---------- rutas ----------

function laConsulta() {
  return ["consultas", contexto().consulta];
}

function elPaciente(sujeto) {
  return [...laConsulta(), "pacientes", sujeto];
}

// ---------- Pacientes (consola) ----------

export async function leerPacientes() {
  const captura = await getDocs(collection(db, ...laConsulta(), "pacientes"));
  return captura.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

export async function leerPaciente(id) {
  const captura = await getDoc(doc(db, ...elPaciente(id)));
  return captura.exists() ? { id: captura.id, ...captura.data() } : null;
}

// El paciente nace sin cuenta vinculada: el uid se rellena cuando acepta la
// invitación. Así el profesional puede montar la ficha y la pauta antes de que
// el cliente entre por primera vez.
export async function crearPaciente({ nombre, correo }) {
  const ref = await addDoc(collection(db, ...laConsulta(), "pacientes"), {
    nombre,
    correo: correo || "",
    uid: null,
    estado: "sin vincular",
    puntos: 0,
    racha: 0,
    v: ESQUEMA,
    alta: serverTimestamp()
  });
  return ref.id;
}

export async function actualizarPaciente(id, campos) {
  await setDoc(
    doc(db, ...elPaciente(id)),
    { ...campos, v: ESQUEMA, actualizado: serverTimestamp() },
    { merge: true }
  );
}

// ---------- Perfil ----------
// Sigue viviendo en config/perfil con los mismos campos que lee hoy.js, para
// que las vistas del paciente no cambien. La ficha de arriba guarda lo que
// necesita la consola (nombre, estado, adherencia); el perfil, lo clínico.

export async function leerPerfil(sujeto) {
  const captura = await getDoc(doc(db, ...elPaciente(sujeto), "config", "perfil"));
  return captura.exists() ? captura.data() : null;
}

export async function guardarPerfil(sujeto, perfil) {
  await setDoc(
    doc(db, ...elPaciente(sujeto), "config", "perfil"),
    { ...perfil, v: ESQUEMA, actualizado: serverTimestamp() },
    { merge: true }
  );
}

// ---------- Pesos ----------
// El identificador del documento es la fecha local: registrar dos veces el
// mismo día corrige el dato en lugar de duplicarlo.

export async function guardarPeso(sujeto, fecha, kg) {
  await setDoc(doc(db, ...elPaciente(sujeto), "pesos", fecha), {
    kg,
    fecha,
    v: ESQUEMA,
    registrado: serverTimestamp()
  });
}

export async function leerPesos(sujeto, cuantos = 60) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "pesos"),
    orderBy("fecha", "desc"),
    limit(cuantos)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => d.data()).reverse();
}

// ---------- Productos ----------
// Pasan a catálogo global: el mismo yogur se pedía a Open Food Facts una vez
// por paciente. El primer argumento se ignora y se mantiene solo para no
// cambiar las llamadas de comida.js.

export async function leerProducto(_sujeto, ean) {
  const captura = await getDoc(doc(db, "productos", ean));
  return captura.exists() ? captura.data() : null;
}

export async function guardarProducto(_sujeto, producto) {
  await setDoc(doc(db, "productos", producto.ean), {
    ...producto,
    v: ESQUEMA,
    guardado: serverTimestamp()
  });
}

// ---------- Entradas de comida ----------
// Cada entrada guarda una COPIA de los macros, nunca una referencia: editar un
// producto o una receta no debe alterar lo que ya está registrado.

export async function guardarEntrada(sujeto, entrada) {
  return addDoc(collection(db, ...elPaciente(sujeto), "entradas"), {
    ...entrada,
    v: ESQUEMA,
    ts: serverTimestamp()
  });
}

export async function leerEntradasDelDia(sujeto, fecha) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "entradas"),
    where("fecha", "==", fecha)
  );
  const captura = await getDocs(consulta);
  return captura.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.hora || "").localeCompare(b.hora || ""));
}

export async function borrarEntrada(sujeto, id) {
  await deleteDoc(doc(db, ...elPaciente(sujeto), "entradas", id));
}

export async function leerEntradasRango(sujeto, desde, hasta) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "entradas"),
    where("fecha", ">=", desde),
    where("fecha", "<=", hasta)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => d.data());
}

// ---------- Recetas ----------

export async function guardarReceta(sujeto, receta) {
  return addDoc(collection(db, ...elPaciente(sujeto), "recetas"), {
    ...receta,
    v: ESQUEMA,
    usos: 0,
    creada: serverTimestamp()
  });
}

export async function leerRecetas(sujeto, cuantas = 30) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "recetas"),
    orderBy("creada", "desc"),
    limit(cuantas)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => ({ id: d.id, ...d.data() }));
}

// ---------- Plantillas de entrenamiento ----------

export async function guardarPlantilla(sujeto, plantilla, id) {
  if (id) {
    await setDoc(
      doc(db, ...elPaciente(sujeto), "plantillas", id),
      { ...plantilla, v: ESQUEMA },
      { merge: true }
    );
    return id;
  }
  const ref = await addDoc(collection(db, ...elPaciente(sujeto), "plantillas"), {
    ...plantilla,
    v: ESQUEMA,
    creada: serverTimestamp()
  });
  return ref.id;
}

export async function leerPlantillas(sujeto) {
  const captura = await getDocs(collection(db, ...elPaciente(sujeto), "plantillas"));
  return captura.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function borrarPlantilla(sujeto, id) {
  await deleteDoc(doc(db, ...elPaciente(sujeto), "plantillas", id));
}

// ---------- Entrenos ----------

export async function guardarEntreno(sujeto, entreno) {
  return addDoc(collection(db, ...elPaciente(sujeto), "entrenos"), {
    ...entreno,
    v: ESQUEMA,
    ts: serverTimestamp()
  });
}

export async function leerEntrenos(sujeto, cuantos = 30) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "entrenos"),
    orderBy("fecha", "desc"),
    limit(cuantos)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function borrarEntreno(sujeto, id) {
  await deleteDoc(doc(db, ...elPaciente(sujeto), "entrenos", id));
}

// ---------- Menú pautado ----------
// Un solo día por ahora ("actual"). El identificador queda abierto para pasar
// a menú semanal sin migrar nada: menu/lunes, menu/martes…

export async function leerMenu(sujeto, dia = "actual") {
  const captura = await getDoc(doc(db, ...elPaciente(sujeto), "menu", dia));
  return captura.exists() ? captura.data() : null;
}

export async function guardarMenu(sujeto, menu, dia = "actual") {
  await setDoc(
    doc(db, ...elPaciente(sujeto), "menu", dia),
    { ...menu, v: ESQUEMA, publicado: serverTimestamp() },
    { merge: false }
  );
}

// Comidas que el paciente marca como hechas. Un documento por día.
export async function leerHechas(sujeto, fecha) {
  const captura = await getDoc(doc(db, ...elPaciente(sujeto), "hechas", fecha));
  return captura.exists() ? captura.data().comidas || [] : [];
}

export async function guardarHechas(sujeto, fecha, comidas) {
  await setDoc(doc(db, ...elPaciente(sujeto), "hechas", fecha), {
    comidas,
    fecha,
    v: ESQUEMA,
    actualizado: serverTimestamp()
  });
}

// ---------- Plantillas de dieta (de la consulta) ----------

export async function leerDietas() {
  const captura = await getDocs(collection(db, ...laConsulta(), "dietas"));
  return captura.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""));
}

export async function guardarDieta(dieta, id) {
  if (id) {
    await setDoc(doc(db, ...laConsulta(), "dietas", id), { ...dieta, v: ESQUEMA }, { merge: true });
    return id;
  }
  const ref = await addDoc(collection(db, ...laConsulta(), "dietas"), {
    ...dieta,
    v: ESQUEMA,
    creada: serverTimestamp()
  });
  return ref.id;
}

export async function borrarDieta(id) {
  await deleteDoc(doc(db, ...laConsulta(), "dietas", id));
}

// ---------- Mensajes ----------
// Hilo inmutable: solo se crean. Puede formar parte de la historia clínica y
// un mensaje editado a posteriori no vale como registro.

export async function leerMensajes(sujeto, cuantos = 50) {
  const consulta = query(
    collection(db, ...elPaciente(sujeto), "mensajes"),
    orderBy("ts", "desc"),
    limit(cuantos)
  );
  const captura = await getDocs(consulta);
  return captura.docs.map((d) => ({ id: d.id, ...d.data() })).reverse();
}

export async function enviarMensaje(sujeto, texto) {
  return addDoc(collection(db, ...elPaciente(sujeto), "mensajes"), {
    texto,
    autor: contexto().uid,
    dePro: contexto().rol !== "paciente",
    v: ESQUEMA,
    ts: serverTimestamp()
  });
}

// ---------- Logros ----------
// PROVISIONAL: los escribe el profesional. Cuando el Worker esté listo pasan a
// ser escritura exclusiva del servidor, porque una medalla que el propio
// paciente puede otorgarse no motiva a nadie.

export async function leerLogros(sujeto) {
  const captura = await getDocs(collection(db, ...elPaciente(sujeto), "logros"));
  return captura.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .sort((a, b) => Number(b.conseguida) - Number(a.conseguida));
}

export async function guardarLogro(sujeto, logro, id) {
  if (id) {
    await setDoc(
      doc(db, ...elPaciente(sujeto), "logros", id),
      { ...logro, v: ESQUEMA },
      { merge: true }
    );
    return id;
  }
  const ref = await addDoc(collection(db, ...elPaciente(sujeto), "logros"), {
    ...logro,
    v: ESQUEMA,
    creado: serverTimestamp()
  });
  return ref.id;
}

export async function borrarLogro(sujeto, id) {
  await deleteDoc(doc(db, ...elPaciente(sujeto), "logros", id));
}

// ---------- Motor ----------
// El objetivo vigente vive en el perfil: es lo que lee la pantalla Hoy.
//
// DECISIÓN: si el objetivo lo ha pautado un profesional, el motor NO lo
// sobrescribe. Deja la propuesta en el perfil y que decida él. Un algoritmo
// que cambia por su cuenta una prescripción deja al nutricionista sin
// responder delante de su cliente.

export async function aplicarObjetivo(sujeto, objetivo, informe) {
  const perfil = await leerPerfil(sujeto);

  if (perfil && perfil.objetivoOrigen === "pautado") {
    await guardarPerfil(sujeto, {
      sugerenciaKcal: objetivo,
      sugerenciaGasto: informe.gasto,
      sugerenciaDesde: new Date().toISOString().slice(0, 10)
    });
    return { aplicado: false, motivo: "pautado" };
  }

  await guardarPerfil(sujeto, {
    objetivoKcal: objetivo,
    objetivoOrigen: "medido",
    objetivoDesde: new Date().toISOString().slice(0, 10),
    gastoMedido: informe.gasto
  });
  return { aplicado: true };
}
