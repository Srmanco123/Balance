import { usuario } from "../data/firebase.js";
import { leerPerfil, guardarPeso, leerPesos } from "../data/repo.js";
import { fechaLocal, comoTexto } from "../core/fechas.js";
import { serieTendencia, tendenciaActual, ritmoSemanal } from "../core/tendencia.js";
import { objetivoInicial, repartoMacros, gastoInicial } from "../core/formulas.js";

export const titulo = "Hoy";

export function mount(caja) {
  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando…</p>`;
  pintar(caja).catch((error) => {
    caja.innerHTML = `<p class="aviso">No se han podido cargar tus datos: ${
      error.code || error.message
    }</p>`;
  });
}

async function pintar(caja) {
  const uid = usuario().uid;
  const [perfil, pesos] = await Promise.all([leerPerfil(uid), leerPesos(uid)]);
  if (!perfil) {
    caja.innerHTML = `<p class="vacio">Faltan tus datos de partida.</p>`;
    return;
  }

  const hoy = fechaLocal();
  const deHoy = pesos.find((p) => p.fecha === hoy);
  const objetivo = objetivoInicial(perfil);
  const macros = repartoMacros(objetivo, perfil);
  const tendencia = tendenciaActual(pesos);
  const ritmo = ritmoSemanal(pesos);

  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">Objetivo de hoy</p>
      <p class="cifra numero">${objetivo}<span> kcal</span></p>
      <div class="macros">
        <span><i style="background:var(--proteina)"></i>${macros.proteina} g proteína</span>
        <span><i style="background:var(--hidratos)"></i>${macros.hidratos} g hidratos</span>
        <span><i style="background:var(--grasa)"></i>${macros.grasa} g grasa</span>
      </div>
      <p class="nota">Estimado sobre un gasto de ${gastoInicial(perfil)} kcal. Se corregirá
      cuando haya semanas suficientes para medirlo de verdad.</p>
    </div>

    <div class="tarjeta">
      <p class="etiqueta">Peso de hoy</p>
      <div class="fila">
        <input type="number" id="kg" inputmode="decimal" min="35" max="250" step="0.1"
               placeholder="0,0" value="${deHoy ? deHoy.kg : ""}">
        <button class="boton boton--principal" id="anotar">${deHoy ? "Corregir" : "Anotar"}</button>
      </div>
      <p class="nota" id="mensaje">${
        deHoy
          ? "Ya registrado hoy. Si lo cambias, se sustituye."
          : "Mejor nada más levantarte, en ayunas y descalzo."
      }</p>
    </div>

    <div class="tarjeta">
      <p class="etiqueta">Tendencia</p>
      <p class="cifra numero">${
        tendencia !== null ? tendencia.toFixed(1).replace(".", ",") : "—"
      }<span> kg</span></p>
      <p class="nota">${
        ritmo === null
          ? "Hacen falta un par de semanas de registros para calcular tu ritmo real."
          : `${ritmo > 0 ? "+" : ""}${ritmo.toFixed(2).replace(".", ",")} kg por semana según la tendencia.`
      }</p>
      ${historial(pesos)}
    </div>
  `;

  const entrada = caja.querySelector("#kg");
  const boton = caja.querySelector("#anotar");
  const mensaje = caja.querySelector("#mensaje");

  boton.addEventListener("click", async () => {
    const kg = Number(String(entrada.value).replace(",", "."));
    if (!kg || kg < 35 || kg > 250) {
      mensaje.textContent = "Ese peso no parece correcto. Revísalo.";
      return;
    }
    boton.disabled = true;
    try {
      await guardarPeso(uid, hoy, kg);
      await pintar(caja);
    } catch (error) {
      mensaje.textContent = "No se ha podido guardar: " + (error.code || error.message);
      boton.disabled = false;
    }
  });
}

function historial(pesos) {
  if (pesos.length < 2) return "";
  const ultimos = serieTendencia(pesos).slice(-7).reverse();
  return `<div class="historial">${ultimos
    .map(
      (p) => `<div class="dato">
        <span>${comoTexto(p.fecha)}</span>
        <code>${p.kg.toFixed(1).replace(".", ",")} kg · tendencia ${p.tendencia
        .toFixed(1)
        .replace(".", ",")}</code>
      </div>`
    )
    .join("")}</div>`;
}

export function unmount() {}
