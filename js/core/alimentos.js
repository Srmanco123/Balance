// Tabla de alimentos genéricos, por 100 g de producto crudo salvo que el
// nombre diga otra cosa.
//
// Son valores medios de tablas públicas de composición. Para pautar un menú
// orientativo sobran; no son analíticas. Si un alimento concreto importa mucho
// en la pauta, mejor añadirlo a la biblioteca de la consulta con los valores
// de su etiqueta.
//
// Formato: [nombre, kcal, proteína, hidratos, grasa, sinónimos]

const TABLA = [
  // Carnes y aves
  ["Pechuga de pollo", 110, 23, 0, 1.6, "pollo"],
  ["Muslo de pollo sin piel", 130, 19, 0, 6, "pollo contramuslo"],
  ["Pechuga de pavo", 105, 24, 0, 1, "pavo"],
  ["Ternera magra", 130, 21, 0, 5, "vacuno res"],
  ["Solomillo de ternera", 145, 21, 0, 6.5, "vacuno"],
  ["Lomo de cerdo", 145, 22, 0, 6, "cinta"],
  ["Solomillo de cerdo", 120, 22, 0, 3.5, ""],
  ["Secreto ibérico", 300, 17, 0, 26, "cerdo"],
  ["Pierna de cordero", 200, 18, 0, 14, ""],
  ["Conejo", 135, 21, 0, 5.5, ""],
  ["Carne picada de ternera 5%", 137, 21, 0, 5, "picada"],
  ["Hígado de ternera", 135, 20, 3, 4, ""],
  ["Jamón serrano", 240, 31, 0, 13, "iberico"],
  ["Jamón cocido", 110, 18, 1.5, 3.5, "york fiambre"],
  ["Fiambre de pavo", 105, 17, 1.5, 3, ""],
  ["Chorizo", 450, 24, 2, 38, "embutido"],
  ["Bacon", 400, 13, 0, 38, "panceta"],
  ["Salchichas frescas", 290, 14, 1, 25, ""],
  ["Morcilla", 380, 14, 8, 34, ""],

  // Pescados y mariscos
  ["Merluza", 75, 17, 0, 0.8, "pescadilla"],
  ["Bacalao fresco", 80, 18, 0, 0.7, ""],
  ["Bacalao desalado", 105, 23, 0, 1, "salado"],
  ["Lubina", 100, 19, 0, 2.5, ""],
  ["Dorada", 95, 19, 0, 2, ""],
  ["Rape", 70, 15, 0, 0.7, ""],
  ["Lenguado", 80, 17, 0, 1.2, ""],
  ["Gallo", 75, 16, 0, 1, ""],
  ["Salmón", 200, 20, 0, 13, ""],
  ["Atún fresco", 145, 23, 0, 5, "bonito"],
  ["Atún en lata al natural", 110, 24, 0, 1, "conserva"],
  ["Atún en lata en aceite escurrido", 190, 25, 0, 10, "conserva"],
  ["Sardina", 165, 18, 0, 10, ""],
  ["Boquerón", 130, 20, 0, 5, "anchoa"],
  ["Caballa", 180, 19, 0, 11, "verdel"],
  ["Trucha", 120, 20, 0, 4, ""],
  ["Pulpo", 80, 16, 1, 1, ""],
  ["Calamar", 80, 16, 1, 1.2, "chipiron"],
  ["Sepia", 75, 16, 0.7, 1, "choco"],
  ["Gambas", 85, 18, 0.5, 1, "camaron"],
  ["Langostinos", 90, 19, 0.5, 1, ""],
  ["Mejillones", 85, 12, 3, 2.2, ""],
  ["Almejas", 75, 12, 2, 1, ""],
  ["Berberechos", 80, 13, 2, 1, ""],
  ["Palitos de surimi", 100, 8, 13, 1.5, "cangrejo"],

  // Huevos y lácteos
  ["Huevo entero", 140, 12.5, 0.7, 9.5, "huevos"],
  ["Clara de huevo", 48, 11, 0.7, 0.2, ""],
  ["Yema de huevo", 320, 16, 0.6, 28, ""],
  ["Leche entera", 63, 3.2, 4.7, 3.6, ""],
  ["Leche semidesnatada", 47, 3.2, 4.7, 1.6, ""],
  ["Leche desnatada", 34, 3.4, 4.8, 0.2, ""],
  ["Bebida de soja sin azúcar", 33, 3.3, 0.8, 1.8, "vegetal"],
  ["Bebida de avena", 45, 0.6, 7, 1.4, "vegetal"],
  ["Bebida de almendra sin azúcar", 15, 0.5, 0.3, 1.2, "vegetal"],
  ["Yogur natural", 60, 3.8, 4.7, 3.2, ""],
  ["Yogur desnatado", 42, 4.5, 5, 0.2, ""],
  ["Yogur griego", 115, 5, 4, 9, ""],
  ["Queso fresco batido 0%", 48, 8, 4, 0.2, "quark"],
  ["Requesón", 95, 11, 3, 4, "cottage"],
  ["Queso fresco de Burgos", 175, 12, 2, 13, ""],
  ["Mozzarella", 250, 18, 2, 19, ""],
  ["Queso manchego curado", 420, 28, 1, 34, ""],
  ["Queso de untar light", 150, 8, 4, 11, "philadelphia"],
  ["Parmesano", 400, 33, 1, 29, "grana"],
  ["Nata para cocinar 18%", 190, 2.5, 3, 18, ""],
  ["Mantequilla", 745, 0.7, 0.6, 82, ""],
  ["Kéfir", 55, 3.5, 4.5, 2.5, ""],

  // Cereales, pan y tubérculos
  ["Arroz blanco crudo", 350, 7, 78, 0.7, ""],
  ["Arroz integral crudo", 345, 8, 73, 2.5, ""],
  ["Pasta seca", 355, 12, 72, 1.5, "macarrones espaguetis"],
  ["Pasta integral seca", 340, 13, 65, 2.5, ""],
  ["Cuscús seco", 360, 12, 72, 1, "couscous"],
  ["Quinoa cruda", 370, 14, 62, 6, ""],
  ["Copos de avena", 370, 13, 60, 7, "avena"],
  ["Pan blanco", 265, 8, 50, 2, "barra"],
  ["Pan integral", 240, 9, 42, 3, ""],
  ["Pan de molde integral", 250, 10, 40, 4, ""],
  ["Pan tostado", 400, 12, 70, 7, "biscote"],
  ["Picos de pan", 430, 11, 70, 13, "reganas"],
  ["Tortilla de trigo", 300, 8, 48, 8, "wrap fajita"],
  ["Harina de trigo", 345, 10, 72, 1.2, ""],
  ["Maíz dulce en lata", 90, 3, 16, 1.2, ""],
  ["Palomitas sin aceite", 380, 12, 70, 5, ""],
  ["Muesli", 370, 10, 62, 9, "cereales"],
  ["Galletas María", 440, 7, 72, 13, ""],
  ["Patata", 80, 2, 17, 0.1, "papa"],
  ["Boniato", 90, 1.6, 20, 0.1, "batata"],

  // Legumbres y derivados
  ["Lentejas crudas", 340, 24, 50, 1.5, ""],
  ["Garbanzos crudos", 360, 19, 55, 6, ""],
  ["Alubias blancas crudas", 330, 22, 50, 1.5, "judias frijoles"],
  ["Lentejas cocidas de bote", 115, 9, 16, 0.5, ""],
  ["Garbanzos cocidos de bote", 130, 8, 18, 3, ""],
  ["Alubias cocidas de bote", 110, 7, 16, 0.6, ""],
  ["Guisantes", 80, 5.5, 11, 0.4, ""],
  ["Soja texturizada", 340, 50, 15, 3, "texturizado"],
  ["Tofu", 120, 13, 1.5, 7, ""],
  ["Tempeh", 190, 19, 8, 11, ""],
  ["Hummus", 230, 7, 14, 16, ""],
  ["Edamame", 120, 11, 9, 5, ""],

  // Verduras y hortalizas
  ["Tomate", 18, 0.9, 3.5, 0.2, ""],
  ["Tomate triturado", 30, 1.3, 5, 0.3, ""],
  ["Cebolla", 38, 1.1, 7.5, 0.1, ""],
  ["Ajo", 130, 6, 28, 0.5, ""],
  ["Pimiento rojo", 30, 1, 6, 0.3, ""],
  ["Pimiento verde", 20, 0.9, 3.5, 0.2, ""],
  ["Calabacín", 17, 1.2, 2, 0.3, ""],
  ["Berenjena", 25, 1, 5, 0.2, ""],
  ["Zanahoria", 38, 0.9, 8, 0.2, ""],
  ["Brócoli", 34, 2.8, 4, 0.4, "brecol"],
  ["Coliflor", 25, 2, 3, 0.3, ""],
  ["Espinacas", 23, 2.9, 1.5, 0.4, ""],
  ["Acelgas", 20, 1.8, 2, 0.2, ""],
  ["Judías verdes", 31, 1.8, 4, 0.2, "vainas"],
  ["Espárragos", 20, 2.2, 2, 0.1, ""],
  ["Champiñones", 22, 3, 1, 0.3, "setas"],
  ["Setas", 25, 2.5, 2, 0.4, "niscalo"],
  ["Lechuga", 15, 1.4, 1.5, 0.2, "ensalada"],
  ["Canónigos", 20, 2, 1.5, 0.4, ""],
  ["Rúcula", 25, 2.6, 2, 0.7, ""],
  ["Pepino", 12, 0.7, 2, 0.1, ""],
  ["Calabaza", 25, 1, 5, 0.1, ""],
  ["Alcachofa", 45, 3, 5, 0.2, ""],
  ["Puerro", 35, 1.5, 6, 0.3, ""],
  ["Repollo", 25, 1.3, 4, 0.1, "col"],
  ["Col lombarda", 30, 1.4, 5, 0.2, ""],
  ["Remolacha cocida", 43, 1.6, 8, 0.2, ""],
  ["Aguacate", 160, 2, 2, 15, ""],
  ["Aceitunas verdes", 145, 1, 1, 15, "olivas"],
  ["Gazpacho", 45, 1, 4, 2.8, ""],

  // Frutas
  ["Manzana", 52, 0.3, 12, 0.2, ""],
  ["Plátano", 90, 1.1, 21, 0.3, "banana"],
  ["Naranja", 45, 0.9, 9, 0.1, ""],
  ["Mandarina", 50, 0.8, 11, 0.2, ""],
  ["Pera", 57, 0.4, 13, 0.1, ""],
  ["Melocotón", 40, 0.9, 9, 0.2, "durazno"],
  ["Fresas", 32, 0.7, 6, 0.3, "freson"],
  ["Sandía", 30, 0.6, 7, 0.2, ""],
  ["Melón", 34, 0.8, 8, 0.2, ""],
  ["Uvas", 70, 0.7, 17, 0.2, ""],
  ["Kiwi", 60, 1.1, 12, 0.5, ""],
  ["Piña", 50, 0.5, 12, 0.1, ""],
  ["Cerezas", 63, 1, 14, 0.2, ""],
  ["Ciruela", 46, 0.7, 10, 0.2, ""],
  ["Higos", 75, 0.8, 16, 0.3, "brevas"],
  ["Arándanos", 57, 0.7, 12, 0.3, ""],
  ["Frambuesas", 52, 1.2, 9, 0.6, ""],
  ["Granada", 83, 1.7, 17, 1.2, ""],
  ["Mango", 60, 0.8, 14, 0.4, ""],
  ["Dátiles", 280, 2.5, 70, 0.4, ""],
  ["Pasas", 300, 3, 75, 0.5, ""],
  ["Orejones de albaricoque", 240, 3.4, 55, 0.5, ""],

  // Frutos secos y semillas
  ["Almendras", 600, 21, 5, 52, ""],
  ["Nueces", 650, 15, 7, 63, ""],
  ["Avellanas", 630, 15, 7, 61, ""],
  ["Anacardos", 570, 18, 27, 43, ""],
  ["Pistachos", 560, 20, 17, 45, ""],
  ["Cacahuetes", 570, 25, 10, 48, "mani"],
  ["Crema de cacahuete", 590, 25, 12, 50, "mantequilla"],
  ["Semillas de chía", 490, 17, 8, 31, ""],
  ["Semillas de lino", 530, 18, 2, 42, ""],
  ["Pipas de girasol", 580, 20, 11, 50, ""],
  ["Sésamo", 570, 17, 12, 50, "ajonjoli"],

  // Aceites y salsas
  ["Aceite de oliva virgen extra", 900, 0, 0, 100, "aove"],
  ["Aceite de girasol", 900, 0, 0, 100, ""],
  ["Mayonesa", 700, 1, 2, 75, ""],
  ["Mayonesa light", 300, 1, 6, 30, ""],
  ["Kétchup", 100, 1, 24, 0.1, "ketchup"],
  ["Mostaza", 70, 4, 6, 3, ""],
  ["Salsa de soja", 60, 6, 6, 0.5, ""],
  ["Tomate frito", 90, 1.5, 9, 5, ""],
  ["Vinagre", 20, 0, 0.5, 0, ""],

  // Otros
  ["Azúcar", 400, 0, 100, 0, ""],
  ["Miel", 300, 0.3, 80, 0, ""],
  ["Chocolate negro 85%", 600, 10, 20, 50, ""],
  ["Chocolate con leche", 540, 7, 55, 32, ""],
  ["Cacao puro en polvo", 350, 20, 15, 22, ""],
  ["Proteína de suero en polvo", 380, 78, 6, 5, "whey batido"],
  ["Gelatina sin azúcar", 8, 1.5, 0, 0, ""],
  ["Caldo de verduras", 8, 0.5, 1, 0.2, ""],
  ["Vino tinto", 85, 0.1, 2.6, 0, ""],
  ["Cerveza", 45, 0.5, 3.6, 0, ""],
  ["Refresco de cola", 42, 0, 10.6, 0, ""],
  ["Café solo", 2, 0.2, 0, 0, ""]
];

// Se normaliza una vez al cargar, no en cada pulsación de tecla.
const INDICE = TABLA.map(([nombre, kcal, proteina, hidratos, grasa, sinonimos]) => ({
  nombre,
  origen: "tabla",
  por100: { kcal, proteina, hidratos, grasa },
  clave: normalizar(nombre + " " + sinonimos)
}));

export function normalizar(texto) {
  return String(texto || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Puntúa para que "merluza" saque primero Merluza y no "Sopa de merluza".
function puntuar(clave, termino) {
  if (clave.startsWith(termino)) return 3;
  if (new RegExp("\\b" + termino).test(clave)) return 2;
  if (clave.includes(termino)) return 1;
  return 0;
}

export function buscarEnTabla(texto, cuantos = 8) {
  const termino = normalizar(texto);
  if (termino.length < 2) return [];

  return INDICE.map((a) => ({ ...a, punto: puntuar(a.clave, termino) }))
    .filter((a) => a.punto > 0)
    .sort((a, b) => b.punto - a.punto || a.nombre.length - b.nombre.length)
    .slice(0, cuantos);
}

// Busca dentro de una lista ya cargada (la biblioteca de la consulta), que
// tiene la misma forma que la tabla pero viene de Firestore.
export function buscarEnLista(lista, texto, cuantos = 6) {
  const termino = normalizar(texto);
  if (termino.length < 2) return [];

  return lista
    .map((a) => ({ ...a, punto: puntuar(normalizar(a.nombre), termino) }))
    .filter((a) => a.punto > 0)
    .sort((a, b) => b.punto - a.punto)
    .slice(0, cuantos);
}

// Regla de tres sobre los valores por 100 g.
export function porCantidad(alimento, gramos) {
  const g = Number(gramos) || 0;
  const f = g / 100;
  const p = alimento.por100 || {};
  return {
    kcal: Math.round((p.kcal || 0) * f),
    proteina: Math.round((p.proteina || 0) * f * 10) / 10,
    hidratos: Math.round((p.hidratos || 0) * f * 10) / 10,
    grasa: Math.round((p.grasa || 0) * f * 10) / 10
  };
}

export const CUANTOS_ALIMENTOS = TABLA.length;
