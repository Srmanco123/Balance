import { sujeto } from "../data/sesion.js";
import { leerPerfil, leerPesos, leerEntradasRango, aplicarObjetivo, guardarPerfil } from "../data/repo.js";
import { evaluar, desviacionFormula, previsión, VENTANA_DIAS } from "../core/motor.js";
import { tendenciaActual, ritmoSemanal } from "../core/tendencia.js";
import { objetivoInicial, repartoMacros } from "../core/formulas.js";
import { fechaLocal, diasAtras } from "../core/fechas.js";

export const titulo = "Progreso";

let caja = null;

export function mount(contenedor) {
  caja = contenedor;
  contenedor.innerHTML = `<p class="vacio" style="margin-top:0">Calculando…</p>`;
  pintar().catch((error) => {
    contenedor.innerHTML = `<p class="aviso">No se ha podido calcular: ${
      error.code || error.message
    }</p>`;
  });
}

export function unmount() {
  caja = null;
}

async function pintar() {
  const uid = sujeto();
  const perfil = await leerPerfil(uid);
  if (!perfil) {
    caja.innerHTML = `<p class="vacio">Faltan tus datos de partida.</p>`;
    return;
  }

  const [pesos, entradas] = await Promise.all([
    leerPesos(uid, 60),
    leerEntradasRango(uid, diasAtras(VENTANA_DIAS - 1), fechaLocal())
  ]);

  // Una fila por día de la ventana, con las calorías sumadas de ese día.
  const porDia = {};
  for (let i = VENTANA_DIAS - 1; i >= 0; i--) porDia[diasAtras(i)] = 0;
  entradas.forEach((e) => {
    if (porDia[e.fecha] !== undefined) porDia[e.fecha] += e.totales?.kcal || 0;
  });
  const diasComida = Object.entries(porDia).map(([fecha, kcal]) => ({ fecha, kcal }));

  const vigente = perfil.objetivoKcal || objetivoInicial(perfil);
  const informe = evaluar({ perfil, pesos, diasComida, objetivoVigente: vigente });

  const tendencia = tendenciaActual(pesos);
  const ritmo = ritmoSemanal(pesos, 28);
  const prevision = previsión(tendencia, perfil.objetivoPeso, ritmo);

  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">Tendencia de peso</p>
      <p class="cifra numero">${
        tendencia !== null ? tendencia.toFixed(1).replace(".", ",") : "—"
      }<span> kg</span></p>
      <p class="nota">${
        ritmo === null
          ? "Aún no hay recorrido suficiente para medir tu ritmo."
          : `${ritmo > 0 ? "+" : ""}${ritmo.toFixed(2).replace(".", ",")} kg por semana.`
      }${
        perfil.objetivoPeso
          ? prevision
            ? prevision.alcanzado
              ? " Objetivo alcanzado."
              : ` A este ritmo, entre ${prevision.min} y ${prevision.max} semanas para llegar a ${perfil.objetivoPeso} kg.`
            : " Con el ritmo actual no hay previsión posible."
          : ""
      }</p>
    </div>

    <div class="tarjeta">
      <p class="etiqueta">Informe del motor</p>
      ${informe.recalcula ? bloqueMedido(perfil, informe) : bloqueQuieto(informe, vigente)}
    </div>

    <div class="tarjeta">
      <p class="etiqueta">Modo pausa</p>
      <p class="nota" style="margin-top:0">${
        perfil.pausado
          ? "El motor está en pausa: sigues registrando, pero tu objetivo no se toca."
          : "Actívalo en vacaciones o si decides mantenerte una temporada."
      }</p>
      <button class="boton" id="pausa">${perfil.pausado ? "Reanudar el motor" : "Pausar el motor"}</button>
    </div>
  `;

  caja.querySelector("#pausa").addEventListener("click", async (evento) => {
    evento.currentTarget.disabled = true;
    await guardarPerfil(uid, { pausado: !perfil.pausado });
    await pintar();
  });

  const aplicar = caja.querySelector("#aplicar");
  if (aplicar) {
    aplicar.addEventListener("click", async (evento) => {
      evento.currentTarget.disabled = true;
      evento.currentTarget.textContent = "Aplicando…";
      await aplicarObjetivo(uid, informe.objetivo, informe);
      await pintar();
    });
  }
}

function bloqueMedido(perfil, i) {
  const desviacion = desviacionFormula(perfil, i.gasto);
  const macros = repartoMacros(i.objetivo, perfil);
  const sube = i.anterior && i.objetivo > i.anterior;

  return `
    <p class="cifra numero">${i.gasto}<span> kcal de gasto real</span></p>
    <p class="nota">Medido con ${i.diasComida} días de comida y una media de
    ${i.ingestaMedia} kcal, contra un ritmo de
    ${i.ritmo.toFixed(2).replace(".", ",")} kg por semana.
    La fórmula de arranque decía ${desviacion.estimado}: se desviaba
    ${Math.abs(desviacion.diferencia)} kcal ${desviacion.diferencia > 0 ? "por debajo" : "por encima"}.</p>

    <div class="dato"><span>Objetivo actual</span><code>${i.anterior || "—"} kcal</code></div>
    <div class="dato"><span>Objetivo propuesto</span><code>${i.objetivo} kcal</code></div>
    <div class="dato"><span>Proteína</span><code>${macros.proteina} g</code></div>
    <div class="dato"><span>Hidratos</span><code>${macros.hidratos} g</code></div>
    <div class="dato"><span>Grasa</span><code>${macros.grasa} g</code></div>

    ${
      i.frenadoPorSalto
        ? `<p class="nota aviso--suave">El cálculo pedía más cambio del que conviene de una
           semana a otra, así que se ha limitado al 10 %. La semana que viene seguirá
           acercándose.</p>`
        : ""
    }
    ${
      i.frenadoPorSuelo
        ? `<p class="nota aviso--suave">Frenado por tu suelo de ${perfil.sueloKcal} kcal.</p>`
        : ""
    }
    <p class="nota">${
      sube
        ? "Sube porque gastas más de lo que se estimaba. Comer más y seguir bajando no es un error del cálculo."
        : "Baja porque tu gasto real es menor que el estimado."
    }</p>
    <button class="boton boton--principal" id="aplicar" style="margin-top:14px">Aplicar ${i.objetivo} kcal</button>
  `;
}

function bloqueQuieto(i, vigente) {
  return `
    <p class="titulillo">El motor no cambia nada esta semana</p>
    <p class="nota">${i.texto}</p>
    <div class="dato"><span>Objetivo vigente</span><code>${vigente} kcal</code></div>
    ${
      i.gasto
        ? `<div class="dato"><span>Gasto medido</span><code>${i.gasto} kcal</code></div>`
        : ""
    }
  `;
}
