// Núcleo puro: funciones sin estado, sin DOM y sin Firebase.
// Solo reciben datos y devuelven números. Es el único sitio con lógica de negocio.

export function edad(fechaNacimiento, hoy = new Date()) {
  const n = new Date(fechaNacimiento);
  let años = hoy.getFullYear() - n.getFullYear();
  const mes = hoy.getMonth() - n.getMonth();
  if (mes < 0 || (mes === 0 && hoy.getDate() < n.getDate())) años--;
  return años;
}

// Mifflin-St Jeor. Solo para arrancar: en dos o tres semanas manda el gasto medido.
export function metabolismoBasal({ sexo, peso, altura, años }) {
  const base = 10 * peso + 6.25 * altura - 5 * años;
  return Math.round(sexo === "hombre" ? base + 5 : base - 161);
}

export const FACTORES = {
  sedentario: 1.3,
  ligero: 1.45,
  activo: 1.6,
  muy_activo: 1.75
};

export function gastoInicial(perfil) {
  const años = edad(perfil.nacimiento);
  const basal = metabolismoBasal({ ...perfil, años });
  return Math.round(basal * (FACTORES[perfil.actividad] || 1.45));
}

// 7700 kcal por kilo de tejido.
export const KCAL_POR_KILO = 7700;

export function deficitDiario(ritmoSemanal) {
  return Math.round((ritmoSemanal * KCAL_POR_KILO) / 7);
}

// Topes de seguridad. El suelo es el metabolismo basal: por debajo de lo que
// gasta el cuerpo en reposo no se baja, venga como venga la báscula.
export function topesSugeridos(perfil) {
  const años = edad(perfil.nacimiento);
  const basal = metabolismoBasal({ ...perfil, años });
  return {
    sueloKcal: Math.round(basal / 10) * 10,
    ritmoMaximo: Math.round(perfil.peso * 0.01 * 100) / 100,
    proteinaPorKilo: 2,
    grasaPorKilo: 0.8
  };
}

export function objetivoInicial(perfil) {
  const gasto = gastoInicial(perfil);
  const bruto = gasto - deficitDiario(perfil.ritmo);
  return Math.max(bruto, perfil.sueloKcal);
}

// Proteína y grasa fijas; los hidratos son el resto.
export function repartoMacros(kcal, { peso, proteinaPorKilo, grasaPorKilo }) {
  const proteina = Math.round(peso * proteinaPorKilo);
  const grasa = Math.round(peso * grasaPorKilo);
  const hidratos = Math.max(0, Math.round((kcal - proteina * 4 - grasa * 9) / 4));
  return { proteina, hidratos, grasa };
}
