// Motor adaptativo. Núcleo puro: recibe datos, devuelve un informe.
// No sabe que existen Firebase ni el DOM.

import { ritmoSemanal, tendenciaActual } from "./tendencia.js";
import { KCAL_POR_KILO, deficitDiario, gastoInicial } from "./formulas.js";

export const VENTANA_DIAS = 14;

// Mínimos por debajo de los cuales el motor se queda quieto en vez de inventar.
export const MINIMO_DIAS_COMIDA = 10;
export const MINIMO_DIAS_PESO = 8;

// Con ~30 días de registro el ritmo medido arrastra ±0,1 kg/semana de
// incertidumbre, que son unas 110 kcal/día. Por debajo de eso no se reacciona:
// sería perseguir ruido de báscula.
export const UMBRAL_RUIDO_KCAL = 110;

// Ni la mejor medición justifica un salto brusco de una semana a otra.
export const CAMBIO_MAXIMO = 0.1;

export function gastoMedido(ingestaMediaDiaria, ritmoKgSemana) {
  return Math.round(ingestaMediaDiaria - (ritmoKgSemana * KCAL_POR_KILO) / 7);
}

// pesos: [{fecha, kg}] ascendente. diasComida: [{fecha, kcal}] de la ventana.
export function evaluar({ perfil, pesos, diasComida, objetivoVigente }) {
  const vigente = objetivoVigente || null;

  if (perfil.pausado) {
    return { recalcula: false, motivo: "pausa", texto: "El motor está en pausa. Registra lo que quieras: no tocará tu objetivo." };
  }

  const conComida = diasComida.filter((d) => d.kcal > 0);
  const ritmo = ritmoSemanal(pesos, VENTANA_DIAS * 2);

  if (pesos.length < MINIMO_DIAS_PESO || ritmo === null) {
    return {
      recalcula: false,
      motivo: "pocos pesos",
      texto: `Faltan pesos: hacen falta al menos ${MINIMO_DIAS_PESO} registros repartidos en dos semanas para medir tu ritmo.`,
      diasPeso: pesos.length
    };
  }

  if (conComida.length < MINIMO_DIAS_COMIDA) {
    return {
      recalcula: false,
      motivo: "poca adherencia",
      texto: `Solo hay ${conComida.length} días de comida registrados de los últimos ${VENTANA_DIAS}. Con menos de ${MINIMO_DIAS_COMIDA} el gasto medido saldría falsamente bajo y te recortaría calorías por un fallo de registro, no por tu metabolismo.`,
      diasComida: conComida.length
    };
  }

  const ingestaMedia = Math.round(
    conComida.reduce((a, d) => a + d.kcal, 0) / conComida.length
  );
  const gasto = gastoMedido(ingestaMedia, ritmo);
  const bruto = gasto - deficitDiario(perfil.ritmo);

  // Topes, en orden: suelo de seguridad y cambio máximo semanal.
  let objetivo = Math.max(bruto, perfil.sueloKcal);
  let frenadoPorSuelo = objetivo > bruto;
  let frenadoPorSalto = false;

  if (frenadoPorSuelo && vigente && Math.abs(objetivo - vigente) < UMBRAL_RUIDO_KCAL) {
    return {
      recalcula: false,
      motivo: "suelo",
      texto: `Tu gasto medido es de ${gasto} kcal. Con el ritmo que has elegido el objetivo saldría en ${bruto}, por debajo de tu suelo de ${perfil.sueloKcal}, así que se queda ahí. Para bajar más rápido, el camino es moverte más, no comer menos.`,
      gasto,
      ingestaMedia,
      ritmo,
      diasComida: conComida.length
    };
  }

  if (vigente) {
    const tope = Math.round(vigente * CAMBIO_MAXIMO);
    if (Math.abs(objetivo - vigente) > tope) {
      objetivo = objetivo > vigente ? vigente + tope : vigente - tope;
      objetivo = Math.max(objetivo, perfil.sueloKcal);
      frenadoPorSalto = true;
    }

    if (Math.abs(objetivo - vigente) < UMBRAL_RUIDO_KCAL) {
      return {
        recalcula: false,
        motivo: "dentro del ruido",
        texto: `La diferencia con tu objetivo actual es de ${Math.abs(
          objetivo - vigente
        )} kcal, por debajo del margen de error de la medición. Se deja como está.`,
        gasto,
        ingestaMedia,
        ritmo,
        diasComida: conComida.length
      };
    }
  }

  return {
    recalcula: true,
    motivo: "medido",
    gasto,
    ingestaMedia,
    ritmo,
    objetivo: Math.round(objetivo / 10) * 10,
    anterior: vigente,
    frenadoPorSuelo,
    frenadoPorSalto,
    diasComida: conComida.length,
    diasPeso: pesos.length,
    tendencia: tendenciaActual(pesos)
  };
}

// Comparación con la fórmula de arranque: útil para ver cuánto se equivocaba.
export function desviacionFormula(perfil, gasto) {
  const estimado = gastoInicial(perfil);
  return { estimado, medido: gasto, diferencia: gasto - estimado };
}

// Previsión de llegada al objetivo, en semanas, con el ritmo medido.
// Devuelve horquilla, nunca una fecha exacta: el ritmo tiene incertidumbre.
export function previsión(tendencia, objetivoPeso, ritmo) {
  if (!objetivoPeso || !ritmo || ritmo >= -0.01) return null;
  const restante = tendencia - objetivoPeso;
  if (restante <= 0) return { alcanzado: true };
  const semanas = restante / Math.abs(ritmo);
  return {
    alcanzado: false,
    min: Math.max(1, Math.round(semanas * 0.8)),
    max: Math.round(semanas * 1.3)
  };
}
