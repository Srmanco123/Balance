// Cuándo subir kilos. Regla determinista, no opinión de un modelo:
// si la última vez completaste todas las series llegando al tope del rango,
// toca subir. Si no, se repite el peso.

export function sugerir(ejercicio, ultimasSeries) {
  const incremento = ejercicio.incremento || 2.5;

  if (!ultimasSeries || !ultimasSeries.length) {
    return { subir: false, kg: null, motivo: "primera vez" };
  }

  const validas = ultimasSeries.filter((s) => s.kg > 0 && s.reps > 0);
  if (validas.length < (ejercicio.series || 3)) {
    return { subir: false, kg: peso(validas), motivo: "faltaron series" };
  }

  const tope = ejercicio.repMax || 12;
  const todasAlTope = validas.every((s) => s.reps >= tope);
  const base = peso(validas);

  if (todasAlTope) {
    return {
      subir: true,
      kg: Math.round((base + incremento) * 2) / 2,
      motivo: `completaste ${validas.length}×${tope}`
    };
  }

  return { subir: false, kg: base, motivo: "repite peso" };
}

// El peso de referencia es el MÍNIMO de las series, no el máximo: si bajaste
// peso a mitad del ejercicio, no completaste el trabajo al peso más alto.
function peso(series) {
  if (!series.length) return null;
  return Math.min(...series.map((s) => s.kg));
}

export function volumen(series) {
  return series.reduce((a, s) => a + (s.kg || 0) * (s.reps || 0), 0);
}
