import { leerPerfil, guardarPerfil } from "../data/repo.js";
import { usuario } from "../data/firebase.js";
import {
  topesSugeridos,
  gastoInicial,
  objetivoInicial,
  repartoMacros,
  edad
} from "../core/formulas.js";

export const titulo = "Tus datos";

const ACTIVIDADES = [
  ["sedentario", "Sentado casi todo el día"],
  ["ligero", "De pie o andando a ratos"],
  ["activo", "En movimiento buena parte del turno"],
  ["muy_activo", "Trabajo físico exigente"]
];

const RITMOS = [
  [0.25, "Lento — 0,25 kg por semana"],
  [0.5, "Medio — 0,5 kg por semana"],
  [0.75, "Rápido — 0,75 kg por semana"]
];

export function mount(caja, alTerminar) {
  const salir =
    alTerminar ||
    (() => document.dispatchEvent(new CustomEvent("balance:ir", { detail: "hoy" })));

  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando…</p>`;
  leerPerfil(usuario().uid)
    .then((previo) => pintar(caja, previo, salir))
    .catch(() => pintar(caja, null, salir));
}

function pintar(caja, previo, alTerminar) {
  const editando = Boolean(previo);
  const v = previo || {};

  caja.innerHTML = `
    <p class="vacio" style="margin-top:0">
      ${
        editando
          ? "<strong>Tus datos.</strong> Cambia lo que haga falta. Tu reparto de macros se mantiene tal y como lo dejaste."
          : `<strong>Antes de empezar.</strong> Con esto se calcula tu punto de partida.
             Las dos o tres primeras semanas trabaja con una fórmula; a partir de ahí manda
             lo que mide tu propia báscula.`
      }
    </p>

    <form id="alta" novalidate>
      <div class="campo">
        <label for="sexo">Sexo</label>
        <select id="sexo">
          <option value="hombre" ${v.sexo === "hombre" ? "selected" : ""}>Hombre</option>
          <option value="mujer" ${v.sexo === "mujer" ? "selected" : ""}>Mujer</option>
        </select>
      </div>

      <div class="campo">
        <label for="nacimiento">Fecha de nacimiento</label>
        <input type="date" id="nacimiento" value="${v.nacimiento || ""}" required>
      </div>

      <div class="campo">
        <label for="altura">Altura (cm)</label>
        <input type="number" id="altura" inputmode="numeric" min="120" max="230" step="1"
               value="${v.altura || ""}" required>
      </div>

      <div class="campo">
        <label for="peso">${
          editando ? "Peso de referencia (kg) — el que usan los macros" : "Peso de partida (kg, en ayunas)"
        }</label>
        <input type="number" id="peso" inputmode="decimal" min="35" max="250" step="0.1"
               value="${v.peso || ""}" required>
      </div>

      <div class="campo">
        <label for="cintura">Cintura (cm, opcional)</label>
        <input type="number" id="cintura" inputmode="decimal" min="40" max="200" step="0.5"
               value="${v.cintura != null ? v.cintura : ""}">
      </div>

      <div class="campo">
        <label for="actividad">Tu día normal</label>
        <select id="actividad">
          ${ACTIVIDADES.map(
            ([val, t]) =>
              `<option value="${val}" ${v.actividad === val ? "selected" : ""}>${t}</option>`
          ).join("")}
        </select>
      </div>

      <div class="campo">
        <label for="ritmo">Ritmo de pérdida</label>
        <select id="ritmo">
          ${RITMOS.map(
            ([val, t]) =>
              `<option value="${val}" ${
                (v.ritmo != null ? Number(v.ritmo) === val : val === 0.5) ? "selected" : ""
              }>${t}</option>`
          ).join("")}
        </select>
      </div>

      <div class="campo">
        <label for="objetivoPeso">Peso objetivo (kg, opcional)</label>
        <input type="number" id="objetivoPeso" inputmode="decimal" min="35" max="250" step="0.1"
               value="${v.objetivoPeso != null ? v.objetivoPeso : ""}">
      </div>

      <div class="tarjeta" id="resumen" hidden></div>

      <p class="aviso" id="aviso" role="alert"></p>
      <button class="boton boton--principal" id="guardar" type="submit">
        ${editando ? "Guardar cambios" : "Calcular y guardar"}
      </button>
      ${editando ? `<button class="boton" id="volver" type="button">Volver</button>` : ""}
    </form>
  `;

  const form = caja.querySelector("#alta");
  const resumen = caja.querySelector("#resumen");
  const aviso = caja.querySelector("#aviso");

  const leer = () => ({
    sexo: form.sexo.value,
    nacimiento: form.nacimiento.value,
    altura: Number(form.altura.value),
    peso: Number(form.peso.value),
    cintura: form.cintura.value ? Number(form.cintura.value) : null,
    actividad: form.actividad.value,
    ritmo: Number(form.ritmo.value),
    objetivoPeso: form.objetivoPeso.value ? Number(form.objetivoPeso.value) : null
  });

  const completo = (d) =>
    d.nacimiento && d.altura >= 120 && d.peso >= 35 && edad(d.nacimiento) >= 16;

  function refrescar() {
    const datos = leer();
    if (!completo(datos)) {
      resumen.hidden = true;
      return null;
    }

    const topes = topesSugeridos(datos);

    // Al editar se conserva el reparto que el usuario haya elegido en Macros:
    // recalcularlo aquí se lo borraría sin avisar.
    const perfil = {
      ...datos,
      sueloKcal: topes.sueloKcal,
      ritmoMaximo: topes.ritmoMaximo,
      proteinaPorKilo: v.proteinaPorKilo != null ? v.proteinaPorKilo : topes.proteinaPorKilo,
      grasaPorKilo: v.grasaPorKilo != null ? v.grasaPorKilo : topes.grasaPorKilo
    };

    perfil.ritmo = Math.min(perfil.ritmo, topes.ritmoMaximo);

    const gasto = gastoInicial(perfil);
    const objetivo = objetivoInicial(perfil);
    const macros = repartoMacros(objetivo, perfil);
    const tocaSuelo = objetivo <= perfil.sueloKcal;
    const ritmoReal = Math.round((((gasto - objetivo) * 7) / 7700) * 100) / 100;

    resumen.hidden = false;
    resumen.innerHTML = `
      <div class="dato"><span>Gasto estimado</span><code>${gasto} kcal</code></div>
      <div class="dato"><span>Objetivo diario</span><code>${objetivo} kcal</code></div>
      <div class="dato"><span>Ritmo previsto</span><code>${ritmoReal
        .toFixed(2)
        .replace(".", ",")} kg/semana</code></div>
      <div class="dato"><span>Suelo de seguridad</span><code>${perfil.sueloKcal} kcal</code></div>
      <div class="dato"><span>Proteína</span><code>${macros.proteina} g</code></div>
      <div class="dato"><span>Hidratos</span><code>${macros.hidratos} g</code></div>
      <div class="dato"><span>Grasa</span><code>${macros.grasa} g</code></div>
      <p class="nota">
        ${
          tocaSuelo
            ? "El ritmo elegido dejaría el objetivo por debajo de tu metabolismo basal, así que se ha limitado al suelo. Bajarás más despacio, pero sostenible."
            : "Cifras de partida, no definitivas: el motor las corregirá con tu propio gasto medido."
        }
      </p>
    `;
    return perfil;
  }

  form.addEventListener("input", refrescar);
  form.addEventListener("change", refrescar);
  if (editando) refrescar();

  const volver = caja.querySelector("#volver");
  if (volver) volver.addEventListener("click", () => alTerminar(previo));

  form.addEventListener("submit", async (evento) => {
    evento.preventDefault();
    aviso.textContent = "";
    const perfil = refrescar();
    if (!perfil) {
      aviso.textContent = "Faltan la fecha de nacimiento, la altura o el peso.";
      return;
    }

    const boton = caja.querySelector("#guardar");
    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
      await guardarPerfil(usuario().uid, perfil);
      alTerminar(perfil);
    } catch (error) {
      aviso.textContent = "No se ha podido guardar: " + (error.code || error.message);
      boton.disabled = false;
      boton.textContent = editando ? "Guardar cambios" : "Calcular y guardar";
    }
  });
}

export function unmount() {}
