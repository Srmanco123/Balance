// Todas las fechas del proyecto pasan por aquí. Es la fuente del 90 % de los
// bugs sutiles: una cena registrada a la una de la madrugada debe contar como
// la del día anterior en hora local, no saltar de día por culpa de UTC.

const ZONA = "Europe/Madrid";

export function fechaLocal(fecha = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: ZONA,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(fecha);
}

export function diasAtras(n, desde = new Date()) {
  const f = new Date(desde);
  f.setDate(f.getDate() - n);
  return fechaLocal(f);
}

export function comoTexto(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function horaLocal(fecha = new Date()) {
  return new Intl.DateTimeFormat("es-ES", {
    timeZone: ZONA,
    hour: "2-digit",
    minute: "2-digit"
  }).format(fecha);
}
