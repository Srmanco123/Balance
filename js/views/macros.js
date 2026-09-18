import { sujeto } from "../data/sesion.js";
import { leerPerfil, guardarPerfil } from "../data/repo.js";
import { objetivoInicial, repartoMacros } from "../core/formulas.js";

export const titulo = "Macros";

// Rangos de referencia. No bloquean: avisan.
const RANGOS = {
  proteina: { min: 1.6, max: 2.5, paso: 0.1 },
  grasa: { min: 0.6, max: 1.2, paso: 0.05 }
};

export function mount(caja) {
  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando…</p>`;
  pintar(caja).catch((error) => {
    caja.innerHTML = `<p class="aviso">No se ha podido cargar: ${error.code || error.message}</p>`;
  });
}

async function pintar(caja) {
  const uid = sujeto();
  const perfil = await leerPerfil(uid);
  if (!perfil) {
    caja.innerHTML = `<p class="vacio">Faltan tus datos de partida.</p>`;
    return;
  }

  caja.innerHTML = `
    <p class="vacio" style="margin-top:0">
      <strong>Tú repartes, el motor manda en el total.</strong>
      Las calorías salen de tu gasto medido. Aquí decides cómo se reparten:
      proteína y grasa se fijan por kilo de peso, y los hidratos son lo que queda.
    </p>

    <div class="campo">
      <label>Proteína por kilo de peso</label>
      <div class="paso">
        <button type="button" class="paso__b" data-ajusta="prot" data-delta="-1" aria-label="Bajar proteína">−</button>
        <span class="paso__v numero"><span id="vProt"></span> g/kg</span>
        <button type="button" class="paso__b" data-ajusta="prot" data-delta="1" aria-label="Subir proteína">+</button>
      </div>
    </div>

    <div class="campo">
      <label>Grasa por kilo de peso</label>
      <div class="paso">
        <button type="button" class="paso__b" data-ajusta="gras" data-delta="-1" aria-label="Bajar grasa">−</button>
        <span class="paso__v numero"><span id="vGras"></span> g/kg</span>
        <button type="button" class="paso__b" data-ajusta="gras" data-delta="1" aria-label="Subir grasa">+</button>
      </div>
    </div>

    <div class="tarjeta" id="reparto"></div>
    <div id="avisos"></div>

    <p class="aviso" id="error" role="alert"></p>
    <button class="boton boton--principal" id="guardar">Guardar reparto</button>
  `;

  // Botones en vez de deslizadores: en iOS los controles de rango se pelean con
  // el gesto de desplazamiento y acaban siendo imposibles de mover con el dedo.
  const LIMITES = {
    prot: { min: 1.2, max: 3, paso: 0.1, decimales: 1 },
    gras: { min: 0.4, max: 1.5, paso: 0.05, decimales: 2 }
  };

  const valores = {
    prot: Number(perfil.proteinaPorKilo),
    gras: Number(perfil.grasaPorKilo)
  };

  function ajustar(cual, pasos) {
    const l = LIMITES[cual];
    const bruto = valores[cual] + pasos * l.paso;
    const acotado = Math.min(l.max, Math.max(l.min, bruto));
    valores[cual] = Number(acotado.toFixed(l.decimales + 1));
    refrescar();
  }

  caja.querySelectorAll("[data-ajusta]").forEach((boton) => {
    boton.addEventListener("click", () =>
      ajustar(boton.dataset.ajusta, Number(boton.dataset.delta))
    );
  });

  function refrescar() {
    const proteinaPorKilo = valores.prot;
    const grasaPorKilo = valores.gras;
    const activo = { ...perfil, proteinaPorKilo, grasaPorKilo };
    const objetivo = objetivoInicial(activo);
    const m = repartoMacros(objetivo, activo);

    const kcalP = m.proteina * 4;
    const kcalH = m.hidratos * 4;
    const kcalG = m.grasa * 9;
    const total = kcalP + kcalH + kcalG || 1;
    const pct = (v) => Math.round((v / total) * 100);

    caja.querySelector("#vProt").textContent = proteinaPorKilo.toFixed(1).replace(".", ",");
    caja.querySelector("#vGras").textContent = grasaPorKilo.toFixed(2).replace(".", ",");

    caja.querySelector("#reparto").innerHTML = `
      <p class="etiqueta">Sobre ${objetivo} kcal al día</p>
      <div class="mecha mecha--ancha">
        <i style="width:${pct(kcalP)}%;background:var(--proteina)"></i>
        <i style="width:${pct(kcalH)}%;background:var(--hidratos)"></i>
        <i style="width:${pct(kcalG)}%;background:var(--grasa)"></i>
      </div>
      <div class="dato"><span>Proteína</span><code>${m.proteina} g · ${pct(kcalP)} %</code></div>
      <div class="dato"><span>Hidratos</span><code>${m.hidratos} g · ${pct(kcalH)} %</code></div>
      <div class="dato"><span>Grasa</span><code>${m.grasa} g · ${pct(kcalG)} %</code></div>
    `;

    const avisos = [];
    if (proteinaPorKilo < RANGOS.proteina.min)
      avisos.push("Proteína baja para un déficit: es la que protege el músculo mientras pierdes grasa.");
    if (proteinaPorKilo > RANGOS.proteina.max)
      avisos.push("Por encima de 2,5 g/kg no se ha visto más beneficio; solo quita sitio a los hidratos.");
    if (grasaPorKilo < RANGOS.grasa.min)
      avisos.push("Grasa por debajo de 0,6 g/kg: es el mínimo habitual para no comprometer la absorción de vitaminas.");
    if (m.hidratos < 60)
      avisos.push("Con tan pocos hidratos, el gimnasio y el pádel se van a notar.");

    caja.querySelector("#avisos").innerHTML = avisos
      .map((t) => `<p class="nota aviso--suave">${t}</p>`)
      .join("");

    return { proteinaPorKilo, grasaPorKilo };
  }

  refrescar();

  caja.querySelector("#guardar").addEventListener("click", async (evento) => {
    const boton = evento.currentTarget;
    const valores = refrescar();
    boton.disabled = true;
    boton.textContent = "Guardando…";
    try {
      await guardarPerfil(uid, valores);
      boton.textContent = "Guardado";
      setTimeout(() => {
        boton.textContent = "Guardar reparto";
        boton.disabled = false;
      }, 1500);
    } catch (error) {
      caja.querySelector("#error").textContent =
        "No se ha podido guardar: " + (error.code || error.message);
      boton.disabled = false;
      boton.textContent = "Guardar reparto";
    }
  });
}

export function unmount() {}
