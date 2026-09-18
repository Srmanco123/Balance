// Quién eres, en qué consulta estás y a quién estás mirando.
//
// Es el único módulo que resuelve el contexto. El resto de la app pide sujeto()
// y no sabe si detrás hay una consulta con cien pacientes o uno solo: por eso
// las vistas del paciente (hoy, comida, progreso) sirven igual cuando las abre
// el profesional sobre la ficha de otra persona.

import { doc, getDoc } from "https://www.gstatic.com/firebasejs/11.0.0/firebase-firestore.js";
import { db, usuario } from "./firebase.js";

// { uid, consulta, rol, paciente, nombre }
let ctx = null;

// A quién se le están leyendo los datos ahora mismo. Para un paciente es
// siempre él; para un profesional cambia al abrir una ficha.
let mirando = null;

export const SIN_ACCESO = "sin-acceso";

export async function abrir() {
  const u = usuario();
  const captura = await getDoc(doc(db, "indice", u.uid));

  // Sin documento de índice no hay consulta a la que pertenecer. No se crea
  // aquí a propósito: si el cliente pudiera escribirlo, cualquiera con una
  // cuenta de Google se montaría su propia consulta dentro del proyecto.
  if (!captura.exists()) {
    ctx = null;
    throw new Error(SIN_ACCESO);
  }

  ctx = { uid: u.uid, ...captura.data() };
  mirando = ctx.paciente || null;
  return ctx;
}

export function cerrar() {
  ctx = null;
  mirando = null;
}

export function contexto() {
  if (!ctx) throw new Error("La sesión no está abierta");
  return ctx;
}

export function hayContexto() {
  return Boolean(ctx);
}

export function esProfesional() {
  return Boolean(ctx) && (ctx.rol === "titular" || ctx.rol === "colaborador");
}

export function esTitular() {
  return Boolean(ctx) && ctx.rol === "titular";
}

// Un profesional puede tener además su propia ficha de paciente: es el caso
// del que usa la app para sí mismo y para sus clientes.
export function tieneFichaPropia() {
  return Boolean(ctx && ctx.paciente);
}

export function sujeto() {
  if (!mirando) throw new Error("No hay paciente activo");
  return mirando;
}

export function haySujeto() {
  return Boolean(mirando);
}

export function mirar(pacienteId) {
  if (!esProfesional() && pacienteId !== ctx.paciente) {
    throw new Error("Solo un profesional puede mirar otra ficha");
  }
  mirando = pacienteId;
}

export function volverAMiFicha() {
  mirando = ctx ? ctx.paciente || null : null;
}

export function mirandoAOtro() {
  return Boolean(ctx) && Boolean(mirando) && mirando !== ctx.paciente;
}
