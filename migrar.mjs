// migrar.mjs — mueve los datos de la v1 a la estructura de consulta.
//
//   usuarios/{uid}/config|pesos|entradas|entrenos|recetas|plantillas
//        →  consultas/{c}/pacientes/{p}/…
//   usuarios/{uid}/productos/{ean}
//        →  productos/{ean}          (catálogo global)
//
// Usa el SDK de administración, así que las reglas de Firestore no le afectan:
// esto se ejecuta desde tu máquina, nunca desde la app.
//
// Uso:
//   node migrar.mjs --clave ./clave.json --uid TU_UID \
//       --consulta balance --paciente manuel --nombre "Manuel" --crear --seco
//
// Quita --seco cuando el recuento te cuadre. Es idempotente: se puede repetir
// sin duplicar nada, porque conserva el identificador de cada documento.

import { readFileSync } from "node:fs";
import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";

/* ---------------- argumentos ---------------- */

const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (!a.startsWith("--")) continue;
  const clave = a.slice(2);
  const siguiente = process.argv[i + 1];
  if (!siguiente || siguiente.startsWith("--")) args[clave] = true;
  else {
    args[clave] = siguiente;
    i++;
  }
}

const CLAVE = args.clave || "./clave.json";
const UID = args.uid;
const CONSULTA = args.consulta || "balance";
const PACIENTE = args.paciente || "titular";
const NOMBRE = args.nombre || "Titular";
const SECO = Boolean(args.seco);
const CREAR = Boolean(args.crear);

if (!UID) {
  console.error("Falta --uid. Lo tienes en Firebase > Authentication > Users.");
  process.exit(1);
}

/* ---------------- arranque ---------------- */

initializeApp({ credential: cert(JSON.parse(readFileSync(CLAVE, "utf8"))) });
const db = getFirestore();

const ESQUEMA = 2;

// Las colecciones de la v1 que cuelgan del usuario. 'productos' va aparte
// porque su destino es la raíz.
const COLECCIONES = ["config", "pesos", "entradas", "entrenos", "recetas", "plantillas"];

const origen = db.collection("usuarios").doc(UID);
const destino = db.collection("consultas").doc(CONSULTA).collection("pacientes").doc(PACIENTE);

/* ---------------- utilidades ---------------- */

// Firestore admite 500 operaciones por lote. Se vacía al llegar al tope.
async function porLotes(docs, escribir) {
  let lote = db.batch();
  let enLote = 0;
  let total = 0;

  for (const d of docs) {
    escribir(lote, d);
    enLote++;
    total++;
    if (enLote === 450) {
      if (!SECO) await lote.commit();
      lote = db.batch();
      enLote = 0;
    }
  }
  if (enLote && !SECO) await lote.commit();
  return total;
}

function pesado(datos) {
  // Aviso de las miniaturas en base64: el límite de Firestore es 1 MB por
  // documento y cada foto de comida se come 40-60 kB.
  const bytes = Buffer.byteLength(JSON.stringify(datos));
  return bytes > 200_000 ? bytes : 0;
}

/* ---------------- migración ---------------- */

async function crearEstructura() {
  console.log("\nCreando consulta, ficha e índice…");
  if (SECO) return;

  await db.collection("consultas").doc(CONSULTA).set(
    { nombre: "Balance", titular: UID, plan: "titular", v: ESQUEMA, alta: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await destino.set(
    { nombre: NOMBRE, uid: UID, estado: "activo", puntos: 0, racha: 0, v: ESQUEMA, alta: FieldValue.serverTimestamp() },
    { merge: true }
  );

  await db.collection("indice").doc(UID).set(
    { consulta: CONSULTA, rol: "titular", paciente: PACIENTE, v: ESQUEMA },
    { merge: true }
  );

  console.log("  consultas/%s", CONSULTA);
  console.log("  consultas/%s/pacientes/%s", CONSULTA, PACIENTE);
  console.log("  indice/%s", UID);
}

async function migrarColecciones() {
  let gordos = 0;

  for (const nombre of COLECCIONES) {
    const captura = await origen.collection(nombre).get();
    if (captura.empty) {
      console.log("%-12s vacía", nombre);
      continue;
    }

    const total = await porLotes(captura.docs, (lote, d) => {
      const datos = d.data();
      const bytes = pesado(datos);
      if (bytes) gordos++;
      lote.set(destino.collection(nombre).doc(d.id), { ...datos, v: ESQUEMA }, { merge: true });
    });

    console.log("%-12s %d documentos", nombre, total);
  }

  if (gordos) {
    console.log(
      "\nAviso: %d documentos pasan de 200 kB. Son las miniaturas en base64 dentro\n" +
        "de Firestore. Se migran igual, pero conviene sacarlas a Cloud Storage antes\n" +
        "de que alguna llegue al límite de 1 MB por documento.",
      gordos
    );
  }
}

async function migrarProductos() {
  const captura = await origen.collection("productos").get();
  if (captura.empty) {
    console.log("%-12s vacía", "productos");
    return;
  }

  const total = await porLotes(captura.docs, (lote, d) => {
    lote.set(db.collection("productos").doc(d.id), { ...d.data(), v: ESQUEMA }, { merge: true });
  });

  console.log("%-12s %d documentos → raíz /productos", "productos", total);
}

async function comprobar() {
  console.log("\nComprobación:");
  for (const nombre of [...COLECCIONES]) {
    const a = (await origen.collection(nombre).count().get()).data().count;
    const b = (await destino.collection(nombre).count().get()).data().count;
    console.log("%-12s origen %d · destino %d %s", nombre, a, b, a === b ? "" : "← REVISAR");
  }
}

/* ---------------- ejecución ---------------- */

console.log(
  "\n%s\nusuarios/%s  →  consultas/%s/pacientes/%s\n",
  SECO ? "MODO SECO: no se escribe nada" : "MIGRANDO DE VERDAD",
  UID,
  CONSULTA,
  PACIENTE
);

try {
  if (CREAR) await crearEstructura();
  console.log("");
  await migrarColecciones();
  await migrarProductos();
  if (!SECO) await comprobar();

  console.log(
    SECO
      ? "\nNada escrito. Si el recuento cuadra, repite sin --seco."
      : "\nHecho. Los datos antiguos siguen en usuarios/%s: no los borres hasta\n" +
          "haber entrado en la app y verlos todos. Para borrarlos después:\n" +
          "  node migrar.mjs --clave %s --uid %s --borrar-origen",
    UID,
    CLAVE,
    UID
  );

  // Borrado del origen, en una pasada aparte y solo si se pide expresamente.
  if (args["borrar-origen"]) {
    console.log("\nBorrando el origen…");
    for (const nombre of [...COLECCIONES, "productos"]) {
      const captura = await origen.collection(nombre).get();
      await porLotes(captura.docs, (lote, d) => lote.delete(d.ref));
      console.log("%-12s borrada (%d)", nombre, captura.size);
    }
    await origen.delete();
    console.log("usuarios/%s borrado", UID);
  }
} catch (error) {
  console.error("\nHa fallado:", error.message);
  process.exit(1);
}
