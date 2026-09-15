import { usuario } from "../data/firebase.js";
import {
  guardarPlantilla,
  leerPlantillas,
  borrarPlantilla,
  guardarEntreno,
  leerEntrenos,
  borrarEntreno
} from "../data/repo.js";
import { sugerir, volumen } from "../core/progresion.js";
import { fechaLocal, horaLocal, comoTexto } from "../core/fechas.js";
import { recoger, confirmar } from "../services/salud.js";

export const titulo = "Entreno";

const ACTIVIDADES = ["Crossfit", "Pádel", "Correr", "Bici", "Caminar", "Otra"];

let caja = null;
let plantillas = [];
let historial = [];

export function mount(contenedor) {
  caja = contenedor;
  contenedor.innerHTML = `<p class="vacio" style="margin-top:0">Cargando…</p>`;
  cargar().catch((error) => {
    contenedor.innerHTML = `<p class="aviso">No se ha podido cargar: ${
      error.code || error.message
    }</p>`;
  });
}

export function unmount() {
  caja = null;
}

async function cargar() {
  const uid = usuario().uid;
  await importarDeSalud(uid);
  [plantillas, historial] = await Promise.all([leerPlantillas(uid), leerEntrenos(uid)]);
  inicio();
}

// Vacía el buzón del Worker hacia Firestore. Si algo falla, no se borra nada
// del buzón y se reintenta en la siguiente apertura.
async function importarDeSalud(uid) {
  try {
    const pendientes = await recoger();
    if (!pendientes.length) return;
    const tratadas = [];
    for (const p of pendientes) {
      if (p.valido && p.entreno.fecha) {
        await guardarEntreno(uid, p.entreno);
      } else {
        console.warn("Sesión de Salud descartada por venir incompleta", p.entreno);
      }
      tratadas.push(p.clave);
    }
    await confirmar(tratadas);
  } catch (error) {
    console.warn("No se ha podido importar de Salud", error);
  }
}

// Los diálogos del navegador (alert, confirm, prompt) quedan bloqueados en
// GitHub Pages, así que los avisos se pintan en la propia página.
function mostrarAviso(texto) {
  const hueco = caja.querySelector("#aviso");
  if (hueco) hueco.textContent = texto;
}

/* ---------------- Pantalla principal ---------------- */

function inicio() {
  caja.innerHTML = `
    <p class="etiqueta">Fuerza</p>
    ${
      plantillas.length
        ? plantillas
            .map(
              (p) => `<button class="boton linea" data-sesion="${p.id}" style="margin-bottom:10px">
                <span>${p.nombre}</span>
                <span class="etiqueta">${p.ejercicios.length} ejercicios</span>
              </button>`
            )
            .join("")
        : `<p class="nota" style="margin-top:0">Todavía no tienes rutinas. Crea una y la app
           recordará tus pesos de una sesión a la siguiente.</p>`
    }
    <button class="boton" id="nuevaPlantilla" style="margin-bottom:24px">Nueva rutina</button>

    <p class="etiqueta">Otra actividad</p>
    <div class="chips" style="margin-bottom:24px">
      ${ACTIVIDADES.map((a) => `<button class="chip" data-actividad="${a}">${a}</button>`).join("")}
    </div>

    <p class="etiqueta">Últimos entrenos</p>
    <div id="historial">${pintarHistorial()}</div>
  `;

  caja.querySelectorAll("[data-sesion]").forEach((b) =>
    b.addEventListener("click", () => sesion(plantillas.find((p) => p.id === b.dataset.sesion)))
  );
  caja.querySelector("#nuevaPlantilla").addEventListener("click", () => editorPlantilla());
  caja.querySelectorAll("[data-actividad]").forEach((b) =>
    b.addEventListener("click", () => registrarActividad(b.dataset.actividad))
  );
  engancharBorrados();
}

function pintarHistorial() {
  if (!historial.length) return `<p class="vacio">Nada registrado todavía.</p>`;
  return historial
    .slice(0, 12)
    .map(
      (e) => `<div class="tarjeta linea">
        <div>
          <p class="titulillo">${e.tipo === "fuerza" ? e.plantillaNombre : e.actividad}</p>
          <p class="etiqueta">${comoTexto(e.fecha)} · ${
        e.tipo === "fuerza"
          ? `${e.series.length} series · ${Math.round(volumen(e.series))} kg de volumen`
          : `${e.duracion} min${e.origen === "salud" ? " · desde Salud" : ""}`
      }</p>
        </div>
        <button class="iconico" data-borrar-entreno="${e.id}" aria-label="Borrar">Borrar</button>
      </div>`
    )
    .join("");
}

function engancharBorrados() {
  caja.querySelectorAll("[data-borrar-entreno]").forEach((b) =>
    b.addEventListener("click", async () => {
      b.disabled = true;
      await borrarEntreno(usuario().uid, b.dataset.borrarEntreno);
      await cargar();
    })
  );
}

/* ---------------- Actividad libre ---------------- */

function registrarActividad(actividad) {
  let minutos = 45;
  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">${actividad}</p>
      <p class="titulillo">¿Cuánto ha durado?</p>
      <div class="paso" style="margin-top:12px">
        <button type="button" class="paso__b" data-min="-5">−</button>
        <span class="paso__v numero"><span id="min">${minutos}</span> min</span>
        <button type="button" class="paso__b" data-min="5">+</button>
      </div>
      <p class="nota">Queda registrado para el informe, pero <strong>no suma calorías</strong>
      a tu presupuesto: tu gasto real ya lo mide la báscula, y sumarlo aquí sería contarlo dos veces.</p>
      <button class="boton boton--principal" id="guardar" style="margin-top:14px">Guardar</button>
      <button class="boton" id="volver" style="margin-top:10px">Cancelar</button>
    </div>
  `;

  caja.querySelectorAll("[data-min]").forEach((b) =>
    b.addEventListener("click", () => {
      minutos = Math.max(5, Math.min(300, minutos + Number(b.dataset.min)));
      caja.querySelector("#min").textContent = minutos;
    })
  );

  caja.querySelector("#volver").addEventListener("click", inicio);
  caja.querySelector("#guardar").addEventListener("click", async (evento) => {
    evento.currentTarget.disabled = true;
    await guardarEntreno(usuario().uid, {
      tipo: "actividad",
      actividad,
      duracion: minutos,
      fecha: fechaLocal(),
      hora: horaLocal()
    });
    await cargar();
  });
}

/* ---------------- Sesión de fuerza ---------------- */

function ultimaDe(plantillaId, ejercicio) {
  const previa = historial.find((e) => e.tipo === "fuerza" && e.plantillaId === plantillaId);
  if (!previa) return [];
  return previa.series.filter((s) => s.ejercicio === ejercicio);
}

function sesion(plantilla) {
  if (!plantilla) return;

  const estado = plantilla.ejercicios.map((ej) => {
    const ultimas = ultimaDe(plantilla.id, ej.nombre);
    const consejo = sugerir(ej, ultimas);
    const kg = consejo.kg != null ? consejo.kg : 20;
    return {
      ejercicio: ej,
      consejo,
      series: Array.from({ length: ej.series || 3 }, (_, n) => ({
        kg,
        reps: ultimas[n] ? ultimas[n].reps : ej.repMax || 10,
        hecha: false
      }))
    };
  });

  const pintar = () => {
    caja.innerHTML = `
      <p class="etiqueta">${plantilla.nombre}</p>
      ${estado
        .map(
          (e, i) => `<div class="tarjeta">
            <div class="ingrediente__cabeza">
              <span class="titulillo">${e.ejercicio.nombre}</span>
              <span class="etiqueta">${e.ejercicio.series}×${e.ejercicio.repMin || 8}-${
            e.ejercicio.repMax || 12
          }</span>
            </div>
            <p class="nota ${e.consejo.subir ? "aviso--suave" : ""}">${
            e.consejo.subir
              ? `Toca subir a ${e.consejo.kg} kg: ${e.consejo.motivo}.`
              : e.consejo.motivo === "primera vez"
              ? "Primera vez: pon el peso con el que empieces."
              : `Repite ${e.consejo.kg} kg.`
          }</p>
            ${e.series
              .map(
                (s, n) => `<div class="serie ${s.hecha ? "serie--hecha" : ""}">
                  <span class="serie__n">${n + 1}</span>
                  <input type="number" inputmode="decimal" step="0.5" min="0" max="500"
                         data-kg="${i}-${n}" value="${s.kg}"> kg
                  <input type="number" inputmode="numeric" step="1" min="0" max="100"
                         data-reps="${i}-${n}" value="${s.reps}"> reps
                  <button class="chip" data-hecha="${i}-${n}">${s.hecha ? "✓" : "Hecha"}</button>
                </div>`
              )
              .join("")}
          </div>`
        )
        .join("")}
      <p class="aviso" id="aviso" role="alert"></p>
      <button class="boton boton--principal" id="terminar">Terminar sesión</button>
      <button class="boton" id="volver" style="margin-top:10px">Cancelar</button>
    `;

    caja.querySelectorAll("[data-kg]").forEach((entrada) =>
      entrada.addEventListener("change", () => {
        const [i, n] = entrada.dataset.kg.split("-").map(Number);
        estado[i].series[n].kg = Number(entrada.value) || 0;
      })
    );
    caja.querySelectorAll("[data-reps]").forEach((entrada) =>
      entrada.addEventListener("change", () => {
        const [i, n] = entrada.dataset.reps.split("-").map(Number);
        estado[i].series[n].reps = Number(entrada.value) || 0;
      })
    );
    caja.querySelectorAll("[data-hecha]").forEach((boton) =>
      boton.addEventListener("click", () => {
        const [i, n] = boton.dataset.hecha.split("-").map(Number);
        estado[i].series[n].hecha = !estado[i].series[n].hecha;
        pintar();
      })
    );

    caja.querySelector("#volver").addEventListener("click", inicio);
    caja.querySelector("#terminar").addEventListener("click", async (evento) => {
      const series = [];
      estado.forEach((e) =>
        e.series.forEach((s) => {
          if (s.hecha) series.push({ ejercicio: e.ejercicio.nombre, kg: s.kg, reps: s.reps });
        })
      );
      if (!series.length) {
        mostrarAviso("Marca al menos una serie como hecha antes de terminar.");
        return;
      }
      evento.currentTarget.disabled = true;
      await guardarEntreno(usuario().uid, {
        tipo: "fuerza",
        plantillaId: plantilla.id,
        plantillaNombre: plantilla.nombre,
        series,
        fecha: fechaLocal(),
        hora: horaLocal()
      });
      await cargar();
    });
  };

  pintar();
}

/* ---------------- Editor de rutinas ---------------- */

function editorPlantilla() {
  let ejercicios = [{ nombre: "", series: 3, repMin: 8, repMax: 12, incremento: 2.5 }];

  const pintar = () => {
    caja.innerHTML = `
      <div class="campo">
        <label for="nombre">Nombre de la rutina</label>
        <input type="text" id="nombre" placeholder="Empuje, Pierna, Torso…">
      </div>
      <div id="lista">
        ${ejercicios
          .map(
            (e, n) => `<div class="tarjeta">
              <div class="campo">
                <label>Ejercicio ${n + 1}</label>
                <input type="text" data-nombre="${n}" value="${e.nombre}" placeholder="Press banca">
              </div>
              <div class="tresColumnas">
                <div class="campo"><label>Series</label>
                  <input type="number" data-series="${n}" value="${e.series}" min="1" max="10"></div>
                <div class="campo"><label>Reps mín.</label>
                  <input type="number" data-repmin="${n}" value="${e.repMin}" min="1" max="50"></div>
                <div class="campo"><label>Reps máx.</label>
                  <input type="number" data-repmax="${n}" value="${e.repMax}" min="1" max="50"></div>
                <div class="campo"><label>Sube (kg)</label>
                  <input type="number" data-incremento="${n}" value="${e.incremento}" min="0.5" max="20" step="0.5"></div>
              </div>
              <button class="iconico" data-quita-ej="${n}">Quitar</button>
            </div>`
          )
          .join("")}
      </div>
      <button class="boton" id="masEjercicio">Añadir ejercicio</button>
      <p class="aviso" id="aviso" role="alert"></p>
      <button class="boton boton--principal" id="guardar" style="margin-top:14px">Guardar rutina</button>
      <button class="boton" id="volver" style="margin-top:10px">Cancelar</button>
    `;

    const nombreGuardado = caja.querySelector("#nombre");
    nombreGuardado.value = editorPlantilla.nombre || "";
    nombreGuardado.addEventListener("input", () => {
      editorPlantilla.nombre = nombreGuardado.value;
    });

    const liga = (atributo, campo, numero) =>
      caja.querySelectorAll(`[data-${atributo}]`).forEach((entrada) =>
        entrada.addEventListener("input", () => {
          const n = Number(entrada.dataset[atributo]);
          ejercicios[n][campo] = numero ? Number(entrada.value) : entrada.value;
        })
      );

    liga("nombre", "nombre", false);
    liga("series", "series", true);
    liga("repmin", "repMin", true);
    liga("repmax", "repMax", true);
    liga("incremento", "incremento", true);

    caja.querySelectorAll("[data-quita-ej]").forEach((b) =>
      b.addEventListener("click", () => {
        ejercicios.splice(Number(b.dataset.quitaEj), 1);
        if (!ejercicios.length) ejercicios = [{ nombre: "", series: 3, repMin: 8, repMax: 12, incremento: 2.5 }];
        pintar();
      })
    );

    caja.querySelector("#masEjercicio").addEventListener("click", () => {
      ejercicios.push({ nombre: "", series: 3, repMin: 8, repMax: 12, incremento: 2.5 });
      pintar();
    });

    caja.querySelector("#volver").addEventListener("click", () => {
      editorPlantilla.nombre = "";
      inicio();
    });

    caja.querySelector("#guardar").addEventListener("click", async (evento) => {
      const nombre = (editorPlantilla.nombre || "").trim();
      const validos = ejercicios.filter((e) => e.nombre.trim());
      if (!nombre || !validos.length) {
        mostrarAviso("Pon un nombre a la rutina y al menos un ejercicio.");
        return;
      }
      evento.currentTarget.disabled = true;
      await guardarPlantilla(usuario().uid, { nombre, ejercicios: validos });
      editorPlantilla.nombre = "";
      await cargar();
    });
  };

  pintar();
}
