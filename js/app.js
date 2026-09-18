import { alCambiarSesion, entrar, resultadoRedireccion } from "./data/firebase.js";
import { leerPerfil } from "./data/repo.js";
import {
  abrir,
  cerrar,
  contexto,
  esProfesional,
  tieneFichaPropia,
  sujeto,
  haySujeto,
  mirar,
  volverAMiFicha,
  mirandoAOtro,
  SIN_ACCESO
} from "./data/sesion.js";
import { MODULOS } from "./config.js";

import * as hoy from "./views/hoy.js";
import * as comida from "./views/comida.js";
import * as entreno from "./views/entreno.js";
import * as progreso from "./views/progreso.js";
import * as ajustes from "./views/ajustes.js";
import * as perfil from "./views/perfil.js";
import * as macros from "./views/macros.js";
import * as consola from "./views/consola.js";
import * as paciente from "./views/paciente.js";
import * as dietas from "./views/dietas.js";

const VISTAS = {
  hoy, comida, entreno, progreso, ajustes, perfil, macros,
  consola, paciente, dietas
};

// Dos juegos de pestañas, no uno de ocho: en un iPhone no caben.
const BARRA_PACIENTE = [
  { id: "hoy", glifo: "◐", activa: true },
  { id: "comida", glifo: "◇", activa: MODULOS.comida },
  { id: "entreno", glifo: "△", activa: MODULOS.entreno },
  { id: "progreso", glifo: "◈", activa: MODULOS.progreso }
];

const BARRA_PRO = [
  { id: "consola", glifo: "◫", activa: true },
  { id: "dietas", glifo: "▤", activa: true }
];

const acceso = document.querySelector("#acceso");
const aplicacion = document.querySelector("#aplicacion");
const caja = document.querySelector("#contenido");
const rotulo = document.querySelector("#titulo");
const barra = document.querySelector("nav");
const cabecera = document.querySelector("header");

let actual = null;
let lado = "paciente";

// El corte por ancho de ventana, no por dispositivo: una tablet girada o una
// ventana a media pantalla engañan a cualquier detección por navegador.
const ANCHA = window.matchMedia("(min-width: 900px)");
const REJILLA = window.matchMedia("(min-width: 1200px)");

let montadas = [];
let fichaAbierta = null;

// El conmutador se crea aquí y no en index.html: solo existe para quien es
// profesional y además tiene ficha propia.
const botonLado = document.createElement("button");
botonLado.className = "iconico";
botonLado.id = "lado";
botonLado.classList.add("oculto");
cabecera.insertBefore(botonLado, cabecera.querySelector("#ajustes"));

function pintarConmutador() {
  const visible = esProfesional() && tieneFichaPropia();
  botonLado.classList.toggle("oculto", !visible);
  botonLado.textContent = lado === "pro" ? "Mi Balance" : "Consulta";
  botonLado.setAttribute(
    "aria-label",
    lado === "pro" ? "Ir a mis propios datos" : "Ir a la consulta"
  );
}

botonLado.addEventListener("click", () => {
  lado = lado === "pro" ? "paciente" : "pro";
  if (lado === "paciente") volverAMiFicha();
  pintarBarra();
  pintarConmutador();
  ir(lado === "pro" ? "consola" : "hoy");
});

function pestañas() {
  return lado === "pro" ? BARRA_PRO : BARRA_PACIENTE;
}

function pintarBarra() {
  barra.innerHTML = pestañas()
    .map(
      (p) => `<button data-vista="${p.id}" ${p.activa ? "" : "disabled"}>
        <span class="glifo">${p.glifo}</span>${VISTAS[p.id].titulo}
      </button>`
    )
    .join("");

  barra.querySelectorAll("button").forEach((boton) => {
    boton.addEventListener("click", () => ir(boton.dataset.vista));
  });
}

// Aviso permanente cuando un profesional está mirando la ficha de otro: evita
// registrar un peso o una comida en el paciente equivocado.
function pintarMirando() {
  const anterior = document.querySelector("#mirando");
  if (anterior) anterior.remove();
  if (!mirandoAOtro()) return;

  const tira = document.createElement("p");
  tira.id = "mirando";
  tira.className = "aviso aviso--suave";
  tira.style.margin = "0 0 12px";
  tira.innerHTML = `Estás viendo la ficha de <b>${paciente.nombreActivo() || "un paciente"}</b>.
    <button class="boton" id="salirFicha" style="margin-top:8px">Volver a la consulta</button>`;
  caja.prepend(tira);
  tira.querySelector("#salirFicha").addEventListener("click", () => {
    volverAMiFicha();
    ir("consola");
  });
}

// En pantalla ancha la consulta se ve entera: lista a la izquierda y ficha a
// la derecha. Es el único sitio donde el ancho cambia la navegación y no solo
// la presentación.
function partida(nombre) {
  return ANCHA.matches && lado === "pro" && (nombre === "consola" || nombre === "paciente");
}

function desmontar(cuales) {
  const lista = cuales || montadas.slice();
  lista.forEach((n) => {
    if (VISTAS[n].unmount) VISTAS[n].unmount();
    montadas = montadas.filter((m) => m !== n);
  });
}

function montar(nombre, zona) {
  VISTAS[nombre].mount(zona);
  montadas.push(nombre);
}

// Repinta solo la ficha, dejando la lista de pacientes montada y con su
// posición de scroll.
function pintarFicha() {
  const der = caja.querySelector("#ladoDer");
  if (!der) return;

  desmontar(["paciente"]);
  der.innerHTML = "";

  if (!fichaAbierta) {
    der.innerHTML = `<p class="vacio">Elige un paciente de la lista para ver su ficha,
      pautarle el objetivo y publicarle el menú.</p>`;
    return;
  }
  montar("paciente", der);
}

function marcarBarra() {
  barra.querySelectorAll("button").forEach((boton) => {
    if (boton.dataset.vista === actual) boton.setAttribute("aria-current", "page");
    else boton.removeAttribute("aria-current");
  });
}

function ir(nombre) {
  const vista = VISTAS[nombre];
  if (!vista) return;

  desmontar();
  caja.innerHTML = "";
  caja.classList.remove("rejilla");

  if (partida(nombre)) {
    actual = "consola";
    rotulo.textContent = "Consulta";
    caja.innerHTML = `<div class="doble">
        <div class="doble__izq" id="ladoIzq"></div>
        <div class="doble__der" id="ladoDer"></div>
      </div>`;
    montar("consola", caja.querySelector("#ladoIzq"));
    pintarFicha();
  } else {
    actual = nombre;
    rotulo.textContent = vista.titulo;
    // A partir de cierto ancho las tarjetas se reparten en columnas en vez de
    // estirarse hasta ocupar un monitor entero.
    if (REJILLA.matches) caja.classList.add("rejilla");
    montar(nombre, caja);
    if (nombre !== "consola" && nombre !== "dietas") pintarMirando();
  }

  caja.scrollTop = 0;
  marcarBarra();
}

// Al girar la tablet o cambiar el tamaño de la ventana se recoloca sola.
ANCHA.addEventListener("change", () => actual && ir(actual));
REJILLA.addEventListener("change", () => actual && ir(actual));

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

// Las vistas piden navegación por evento en vez de importar el enrutador:
// evita dependencias circulares entre app.js y las propias vistas.
document.addEventListener("balance:ir", (evento) => ir(evento.detail));

// La consola pide abrir una ficha: fija el sujeto y entra en la vista.
document.addEventListener("balance:abrirPaciente", (evento) => {
  mirar(evento.detail);
  fichaAbierta = evento.detail;
  if (partida("consola")) pintarFicha();
  else ir("paciente");
});

resultadoRedireccion().catch((error) => {
  document.querySelector("#aviso").textContent =
    "No se ha podido iniciar sesión: " + (error.code || error.message);
});

function sinAcceso() {
  aplicacion.classList.add("oculto");
  acceso.classList.remove("oculto");
  document.querySelector("#aviso").innerHTML = `Tu cuenta no está vinculada a ninguna
    consulta. Si tu nutricionista te ha invitado, abre el enlace del correo.`;
  document.querySelector("#entrar").disabled = false;
}

async function arrancar() {
  try {
    await abrir();
  } catch (error) {
    if (error.message === SIN_ACCESO) return sinAcceso();
    throw error;
  }

  lado = esProfesional() ? "pro" : "paciente";
  pintarBarra();
  pintarConmutador();

  if (lado === "pro") {
    ir("consola");
    return;
  }

  let datos = null;
  try {
    datos = await leerPerfil(sujeto());
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
  montadas = ["perfil"];
  perfil.mount(caja, () => {
    barra.classList.remove("oculto");
    ir("hoy");
  });
}

alCambiarSesion((u) => {
  if (u) {
    acceso.classList.add("oculto");
    aplicacion.classList.remove("oculto");
    if (!actual) {
      arrancar().catch((error) => {
        document.querySelector("#aviso").textContent =
          "No se ha podido abrir la sesión: " + (error.code || error.message);
      });
    }
  } else {
    desmontar();
    actual = null;
    fichaAbierta = null;
    cerrar();
    aplicacion.classList.add("oculto");
    acceso.classList.remove("oculto");
    barra.classList.remove("oculto");
    botonLado.classList.add("oculto");
    document.querySelector("#entrar").disabled = false;
  }
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

// Para que otras vistas sepan si hay paciente activo sin importar sesion.js.
export { haySujeto, contexto };
