// Adaptador de Open Food Facts. Si la API cambia, se toca este archivo y nada más.
//
// Dos trampas conocidas:
//  - Responde HTTP 200 aunque el producto no exista: hay que mirar el cuerpo.
//  - Los nutrientes vienen por 100 g o por 100 ml según el producto, y algunos
//    solo traen valores por ración. Todo se normaliza aquí a "por 100".

const BASE = "https://world.openfoodfacts.org/api/v2/product/";
const CAMPOS = [
  "product_name",
  "product_name_es",
  "brands",
  "nutriments",
  "serving_size",
  "serving_quantity",
  "quantity",
  "product_quantity"
].join(",");

function numero(valor) {
  const n = Number(valor);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function porCien(nutrimentos) {
  const kcal =
    numero(nutrimentos["energy-kcal_100g"]) ??
    (numero(nutrimentos["energy_100g"]) !== null
      ? Math.round(numero(nutrimentos["energy_100g"]) / 4.184)
      : null);

  return {
    kcal,
    proteina: numero(nutrimentos.proteins_100g),
    hidratos: numero(nutrimentos.carbohydrates_100g),
    grasa: numero(nutrimentos.fat_100g),
    fibra: numero(nutrimentos.fiber_100g) ?? 0
  };
}

export async function buscar(ean) {
  const url = `${BASE}${encodeURIComponent(ean)}.json?fields=${CAMPOS}`;
  const respuesta = await fetch(url);
  if (!respuesta.ok) throw new Error("La base de datos no responde");

  const datos = await respuesta.json();
  const existe = datos.status === 1 || datos.status === "success";
  if (!existe || !datos.product) return null;

  const p = datos.product;
  const macros = porCien(p.nutriments || {});
  if (macros.kcal === null) return { ean, incompleto: true, nombre: p.product_name || "" };

  return {
    ean,
    nombre: p.product_name_es || p.product_name || "Sin nombre",
    marca: (p.brands || "").split(",")[0].trim(),
    por100: macros,
    racionGramos: numero(p.serving_quantity),
    racionTexto: p.serving_size || null,
    envaseGramos: numero(p.product_quantity),
    envaseTexto: p.quantity || null,
    incompleto: false
  };
}

// Macros de una cantidad concreta, a partir de los valores por 100.
export function paraCantidad(por100, gramos) {
  const factor = gramos / 100;
  const red = (v) => Math.round((v || 0) * factor * 10) / 10;
  return {
    kcal: Math.round((por100.kcal || 0) * factor),
    proteina: red(por100.proteina),
    hidratos: red(por100.hidratos),
    grasa: red(por100.grasa),
    fibra: red(por100.fibra)
  };
}
