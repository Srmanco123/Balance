// Plantillas de dieta de la consulta. Se crean desde el menú de un paciente
// ("Guardar como plantilla") y se aplican desde ahí mismo: aquí solo se
// consultan y se borran, para no tener dos editores del mismo objeto.

import { leerDietas, borrarDieta } from "../data/repo.js";

export const titulo = "Plantillas";

let caja = null;

export function mount(zona) {
  caja = zona;
  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando plantillas…</p>`;
  pintar().catch((error) => {
    caja.innerHTML = `<p class="aviso">No se han podido cargar: ${
      error.code || error.message
    }</p>`;
  });
}

export function unmount() {
  caja = null;
}

function kcalDe(dieta) {
  return (dieta.comidas || []).reduce(
    (t, c) => t + (c.items || []).reduce((s, i) => s + (Number(i.kcal) || 0), 0),
    0
  );
}

const RIGIDEZ = { exacto: "Gramos exactos", intercambio: "Con intercambios", flexible: "Guía flexible" };

async function pintar() {
  const dietas = await leerDietas();

  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">Plantillas de dieta</p>
      <p class="cifra numero">${dietas.length}<span> guardadas</span></p>
      <p class="nota">Son de la consulta, no de un paciente. Para crear una nueva, monta el menú
        en la ficha de cualquier paciente y pulsa «Guardar como plantilla».</p>
    </div>

    <div class="historial">
      ${
        dietas.length
          ? dietas
              .map(
                (d) => `<div class="fila fila--dieta">
          <span class="fila__texto">
            <b>${d.nombre}</b>
            <em>${(d.comidas || []).length} comidas · ${kcalDe(d)} kcal · ${
                  RIGIDEZ[d.rigidez] || "Sin nivel"
                }</em>
          </span>
          <button class="iconico" data-borrar="${d.id}" aria-label="Borrar">×</button>
        </div>`
              )
              .join("")
          : `<p class="vacio">Todavía no tienes plantillas.</p>`
      }
    </div>
    <p class="nota" id="avisoDietas"></p>`;

  caja.querySelectorAll("[data-borrar]").forEach((b) =>
    b.addEventListener("click", async () => {
      try {
        await borrarDieta(b.dataset.borrar);
        await pintar();
      } catch (error) {
        caja.querySelector("#avisoDietas").textContent =
          "No se ha podido borrar: " + (error.code || error.message);
      }
    })
  );
}
