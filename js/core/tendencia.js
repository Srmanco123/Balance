// Media móvil exponencial ponderada sobre el peso diario.
// El peso oscila por agua y sal, así que la app muestra el dato del día
// pero el motor solo obedece a la tendencia.

const ALFA = 0.25;

// pesos: [{ fecha: "2026-09-13", kg: 84.2 }], de más antiguo a más reciente.
export function serieTendencia(pesos) {
  let previo = null;
  return pesos.map((p) => {
    previo = previo === null ? p.kg : ALFA * p.kg + (1 - ALFA) * previo;
    return { fecha: p.fecha, kg: p.kg, tendencia: Math.round(previo * 100) / 100 };
  });
}

export function tendenciaActual(pesos) {
  const serie = serieTendencia(pesos);
  return serie.length ? serie[serie.length - 1].tendencia : null;
}

// Ritmo de cambio en kg por semana.
// Por regresión lineal sobre TODOS los puntos de la ventana, no restando el
// primero del último: con pocos datos, un solo día de retención de agua en un
// extremo invertía el signo del resultado.
export function ritmoSemanal(pesos, ventanaDias = 28) {
  const serie = serieTendencia(pesos);
  if (serie.length < 8) return null;

  const fin = new Date(serie[serie.length - 1].fecha);
  const puntos = serie.filter(
    (p) => (fin - new Date(p.fecha)) / 86400000 <= ventanaDias
  );
  if (puntos.length < 8) return null;

  const inicio = new Date(puntos[0].fecha);
  const recorrido = (fin - inicio) / 86400000;
  if (recorrido < 14) return null;

  const x = puntos.map((p) => (new Date(p.fecha) - inicio) / 86400000);
  const y = puntos.map((p) => p.tendencia);
  const n = x.length;
  const mediaX = x.reduce((a, b) => a + b, 0) / n;
  const mediaY = y.reduce((a, b) => a + b, 0) / n;

  let arriba = 0;
  let abajo = 0;
  for (let i = 0; i < n; i++) {
    arriba += (x[i] - mediaX) * (y[i] - mediaY);
    abajo += (x[i] - mediaX) ** 2;
  }
  if (abajo === 0) return null;

  return Math.round((arriba / abajo) * 7 * 100) / 100;
}

// Días con registro dentro de la ventana. El motor lo usa para decidir si hay
// datos suficientes o si debe quedarse quieto.
export function diasConDato(pesos, ventanaDias = 28) {
  if (!pesos.length) return 0;
  const fin = new Date(pesos[pesos.length - 1].fecha);
  return pesos.filter((p) => (fin - new Date(p.fecha)) / 86400000 <= ventanaDias).length;
}
