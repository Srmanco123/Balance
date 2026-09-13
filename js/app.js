import { alCambiarSesion, entrar, resultadoRedireccion, usuario } from "./data/firebase.js";
import { leerPerfil } from "./data/repo.js";
import { MODULOS } from "./config.js";

import * as hoy from "./views/hoy.js";
import * as comida from "./views/comida.js";
import * as entreno from "./views/entreno.js";
import * as progreso from "./views/progreso.js";
import * as ajustes from "./views/ajustes.js";
import * as perfil from "./views/perfil.js";

const VISTAS = { hoy, comida, entreno, progreso, ajustes, perfil };

const PESTANAS = [
  { id: "hoy", glifo: "◐", activa: true },
  { id: "comida", glifo: "◇", activa: MODULOS.comida },
  { id: "entreno", glifo: "△", activa: MODULOS.entreno },
  { id: "progreso", glifo: "◈", activa: MODULOS.progreso }
];

const acceso = document.querySelector("#acceso");
const aplicacion = document.querySelector("#aplicacion");
const caja = document.querySelector("#contenido");
const rotulo = document.querySelector("#titulo");
const barra = document.querySelector("nav");

let actual = null;

function pintarBarra() {
  barra.innerHTML = PESTANAS.map(
    (p) => `<button data-vista="${p.id}" ${p.activa ? "" : "disabled"}>
        <span class="glifo">${p.glifo}</span>${VISTAS[p.id].titulo}
      </button>`
  ).join("");

  barra.querySelectorAll("button").forEach((boton) => {
    boton.addEventListener("click", () => ir(boton.dataset.vista));
  });
}

function ir(nombre) {
  const vista = VISTAS[nombre];
  if (!vista) return;
  if (actual && VISTAS[actual].unmount) VISTAS[actual].unmount();
  actual = nombre;
  rotulo.textContent = vista.titulo;
  caja.innerHTML = "";
  vista.mount(caja);
  caja.scrollTop = 0;
  barra.querySelectorAll("button").forEach((boton) => {
    if (boton.dataset.vista === nombre) boton.setAttribute("aria-current", "page");
    else boton.removeAttribute("aria-current");
  });
}

document.querySelector("#entrar").addEventListener("click", async (evento) => {
  const boton = evento.currentTarget;
  boton.disabled = true;
  document.querySelector("#aviso").textContent = "";
  try {
    await entrar();
  } catch (error) {
    document.querySelector("#aviso").textContent =
      "No se ha podido iniciar sesión: " + (error.code || error.message);
    boton.disabled = false;
  }
});

document.querySelector("#ajustes").addEventListener("click", () => ir("ajustes"));

// Si la sesión vino por redirección, el error aparece aquí y no en el botón.
resultadoRedireccion().catch((error) => {
  document.querySelector("#aviso").textContent =
    "No se ha podido iniciar sesión: " + (error.code || error.message);
});

async function arrancar() {
  pintarBarra();
  let datos = null;
  try {
    datos = await leerPerfil(usuario().uid);
  } catch (error) {
    console.warn("No se ha podido leer el perfil", error);
  }

  if (datos) {
    ir("hoy");
    return;
  }

  // Primera vez: alta de datos antes de nada. Sin barra hasta terminar.
  barra.classList.add("oculto");
  rotulo.textContent = perfil.titulo;
  actual = "perfil";
  caja.innerHTML = "";
  perfil.mount(caja, () => {
    barra.classList.remove("oculto");
    ir("hoy");
  });
}

alCambiarSesion((u) => {
  if (u) {
    acceso.classList.add("oculto");
    aplicacion.classList.remove("oculto");
    if (!actual) arrancar();
  } else {
    if (actual && VISTAS[actual].unmount) VISTAS[actual].unmount();
    actual = null;
    aplicacion.classList.add("oculto");
    acceso.classList.remove("oculto");
    barra.classList.remove("oculto");
    document.querySelector("#entrar").disabled = false;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
