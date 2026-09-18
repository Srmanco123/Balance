// Lista de pacientes de la consulta. Es la primera pantalla del profesional.

import { leerPacientes, crearPaciente } from "../data/repo.js";
import { contexto } from "../data/sesion.js";

export const titulo = "Consulta";

let caja = null;

export function mount(zona) {
  caja = zona;
  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando pacientes…</p>`;
  pintar().catch((error) => {
    caja.innerHTML = `<p class="aviso">No se han podido cargar los pacientes: ${
      error.code || error.message
    }</p>`;
  });
}

export function unmount() {
  caja = null;
}

function tono(p) {
  if (p.estado === "sin vincular") return "";
  if ((p.adherencia ?? 0) >= 80) return "--bien";
  if ((p.adherencia ?? 0) >= 50) return "--ojo";
  return "--mal";
}

function etiquetaEstado(p) {
  if (p.estado === "sin vincular") return "Sin vincular";
  if (p.adherencia == null) return "Sin datos";
  if (p.adherencia >= 80) return "Al día";
  if (p.adherencia >= 50) return "Vigilar";
  return "Sin registrar";
}

async function pintar() {
  const pacientes = await leerPacientes();

  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">Pacientes activos</p>
      <p class="cifra numero">${pacientes.length}<span> en la consulta</span></p>
      <p class="nota">Toca un paciente para ver su ficha, pautar su objetivo y publicar su menú.</p>
    </div>

    <div class="historial" id="lista">
      ${
        pacientes.length
          ? pacientes
              .map(
                (p) => `
        <button class="fila fila--paciente" data-abrir="${p.id}">
          <span class="fila__anillo${tono(p)}">${
                  p.adherencia != null ? p.adherencia : "–"
                }</span>
          <span class="fila__texto">
            <b>${p.nombre || "Sin nombre"}</b>
            <em>${p.plan || "Sin plan asignado"}</em>
          </span>
          <span class="chip chip${tono(p)}">${etiquetaEstado(p)}</span>
        </button>`
              )
              .join("")
          : `<p class="vacio">Todavía no hay pacientes. Da de alta al primero.</p>`
      }
    </div>

    <div class="tarjeta" id="alta">
      <p class="titulillo">Nuevo paciente</p>
      <label class="campo">Nombre y apellidos
        <input id="nombre" type="text" autocomplete="off" placeholder="Lucía Ferrer">
      </label>
      <label class="campo">Correo
        <input id="correo" type="email" autocomplete="off" placeholder="lucia@correo.com">
      </label>
      <button class="boton boton--principal" id="crear">Dar de alta</button>
      <p class="nota" id="resultado"></p>
      <p class="nota">La ficha se crea sin cuenta vinculada: puedes pautarle la dieta antes de
        que entre por primera vez. El vínculo real se hará con el enlace de invitación cuando
        el Worker esté desplegado.</p>
    </div>`;

  caja.querySelectorAll("[data-abrir]").forEach((boton) => {
    boton.addEventListener("click", () => {
      document.dispatchEvent(
        new CustomEvent("balance:abrirPaciente", { detail: boton.dataset.abrir })
      );
    });
  });

  const crear = caja.querySelector("#crear");
  crear.addEventListener("click", async () => {
    const nombre = caja.querySelector("#nombre").value.trim();
    const correo = caja.querySelector("#correo").value.trim();
    const aviso = caja.querySelector("#resultado");

    if (!nombre) {
      aviso.textContent = "Hace falta un nombre.";
      return;
    }

    crear.disabled = true;
    aviso.textContent = "Creando…";
    try {
      const id = await crearPaciente({ nombre, correo });
      aviso.innerHTML = `Ficha creada. Enlace de invitación:
        <code>${enlaceInvitacion(id)}</code>`;
      await pintar();
    } catch (error) {
      aviso.textContent = "No se ha podido crear: " + (error.code || error.message);
      crear.disabled = false;
    }
  });
}

// El enlace se construye aquí solo para poder copiarlo. NO da acceso por sí
// mismo: cuando el Worker esté listo lo firmará y será él quien escriba el
// documento de índice y los claims del token.
function enlaceInvitacion(pacienteId) {
  const base = location.origin + location.pathname;
  return `${base}?consulta=${contexto().consulta}&paciente=${pacienteId}`;
}
