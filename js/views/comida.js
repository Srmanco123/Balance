import { usuario } from "../data/firebase.js";
import {
  leerProducto,
  guardarProducto,
  guardarEntrada,
  leerEntradasDelDia,
  borrarEntrada,
  guardarReceta,
  leerRecetas
} from "../data/repo.js";
import { buscar, paraCantidad } from "../services/barcodes.js";
import { analizar, reescalar, sumar } from "../services/vision.js";
import { escanear, detener, leerDeFoto } from "../ui/escaner.js";
import { fechaLocal, horaLocal } from "../core/fechas.js";

export const titulo = "Comida";

let caja = null;
let modo = "foto";

export function mount(contenedor) {
  caja = contenedor;
  contenedor.innerHTML = `
    <div class="segmentos" id="segmentos">
      <button data-modo="foto">Foto</button>
      <button data-modo="barras">Código</button>
      <button data-modo="recetas">Recetas</button>
    </div>
    <div id="panel"></div>
    <p class="aviso" id="aviso" role="alert"></p>
    <div id="ficha"></div>
    <div id="diario"></div>
  `;

  contenedor.querySelectorAll("[data-modo]").forEach((boton) =>
    boton.addEventListener("click", () => cambiar(boton.dataset.modo))
  );

  cambiar(modo);
  pintarDiario();
}

export function unmount() {
  detener();
  caja = null;
}

function avisar(texto) {
  if (caja) caja.querySelector("#aviso").textContent = texto || "";
}

function cambiar(nuevo) {
  modo = nuevo;
  detener();
  avisar("");
  caja.querySelector("#ficha").innerHTML = "";
  caja.querySelectorAll("[data-modo]").forEach((b) =>
    b.setAttribute("aria-current", b.dataset.modo === modo ? "true" : "false")
  );

  const panel = caja.querySelector("#panel");
  if (modo === "foto") panelFoto(panel);
  if (modo === "barras") panelBarras(panel);
  if (modo === "recetas") panelRecetas(panel);
}

/* ---------------- Foto ---------------- */

function panelFoto(panel) {
  panel.innerHTML = `
    <p class="nota" style="margin-top:0">
      Saca el plato desde arriba y con luz. La estimación tiene un margen real,
      así que revisa los gramos antes de anotar: es donde se gana la precisión.
    </p>
    <input type="file" id="archivo" accept="image/*" capture="environment" hidden>
    <button class="boton boton--principal" id="hacerFoto">Hacer foto del plato</button>
    <div class="campo" style="margin-top:14px">
      <label for="pista">Pista para el análisis (opcional)</label>
      <input type="text" id="pista" placeholder="Arroz con pollo, plato hondo">
    </div>
  `;

  const archivo = panel.querySelector("#archivo");
  panel.querySelector("#hacerFoto").addEventListener("click", () => archivo.click());

  archivo.addEventListener("change", async () => {
    if (!archivo.files || !archivo.files[0]) return;
    const boton = panel.querySelector("#hacerFoto");
    boton.disabled = true;
    boton.textContent = "Analizando…";
    avisar("");
    try {
      const resultado = await analizar(archivo.files[0], panel.querySelector("#pista").value);
      fichaIngredientes(resultado);
    } catch (error) {
      avisar(error.message);
    } finally {
      boton.disabled = false;
      boton.textContent = "Hacer foto del plato";
      archivo.value = "";
    }
  });
}

function fichaIngredientes(resultado) {
  let items = resultado.items.map((i) => ({ ...i }));

  const pintar = () => {
    const total = sumar(items);
    caja.querySelector("#ficha").innerHTML = `
      <div class="tarjeta">
        <img class="miniatura" src="${resultado.miniatura}" alt="">
        <p class="etiqueta">Corrige los gramos si hace falta</p>

        <div id="ingredientes">
          ${items
            .map(
              (i, n) => `<div class="ingrediente">
                <div class="ingrediente__cabeza">
                  <span class="titulillo">${i.nombre}</span>
                  <button class="iconico" data-quita="${n}" aria-label="Quitar">Quitar</button>
                </div>
                <div class="paso">
                  <button type="button" class="paso__b" data-ajusta="${n}" data-delta="-10">−</button>
                  <input class="paso__v numero" type="number" inputmode="numeric"
                         data-gramos="${n}" value="${i.gramos}" min="1" max="3000">
                  <button type="button" class="paso__b" data-ajusta="${n}" data-delta="10">+</button>
                </div>
                <p class="etiqueta">${i.kcal} kcal · ${i.proteina} P · ${i.hidratos} H · ${i.grasa} G
                ${i.confianza === "baja" ? " · <em>poco seguro</em>" : ""}</p>
              </div>`
            )
            .join("")}
        </div>

        <p class="cifra numero">${total.kcal}<span> kcal</span></p>
        <div class="macros">
          <span><i style="background:var(--proteina)"></i>${total.proteina} g proteína</span>
          <span><i style="background:var(--hidratos)"></i>${total.hidratos} g hidratos</span>
          <span><i style="background:var(--grasa)"></i>${total.grasa} g grasa</span>
        </div>
        ${resultado.nota ? `<p class="nota">${resultado.nota}</p>` : ""}

        <button class="boton boton--principal" id="anotar" style="margin-top:14px">Anotar</button>
        <div class="campo" style="margin-top:16px">
          <label for="nombreReceta">Guardar como receta</label>
          <div class="fila">
            <input type="text" id="nombreReceta" placeholder="Pollo al horno con patata">
            <button class="boton" id="comoReceta">Guardar</button>
          </div>
        </div>
      </div>
    `;

    caja.querySelectorAll("[data-ajusta]").forEach((boton) =>
      boton.addEventListener("click", () => {
        const n = Number(boton.dataset.ajusta);
        const nuevos = Math.max(1, items[n].gramos + Number(boton.dataset.delta));
        items[n] = reescalar(items[n], nuevos);
        pintar();
      })
    );

    caja.querySelectorAll("[data-gramos]").forEach((entrada) =>
      entrada.addEventListener("change", () => {
        const n = Number(entrada.dataset.gramos);
        items[n] = reescalar(items[n], Math.max(1, Number(entrada.value) || 1));
        pintar();
      })
    );

    caja.querySelectorAll("[data-quita]").forEach((boton) =>
      boton.addEventListener("click", () => {
        items.splice(Number(boton.dataset.quita), 1);
        if (!items.length) {
          caja.querySelector("#ficha").innerHTML = "";
          return;
        }
        pintar();
      })
    );

    caja.querySelector("#anotar").addEventListener("click", async (evento) => {
      evento.currentTarget.disabled = true;
      try {
        await guardarEntrada(usuario().uid, {
          origen: "foto",
          fecha: fechaLocal(),
          hora: horaLocal(),
          items,
          totales: sumar(items)
        });
        caja.querySelector("#ficha").innerHTML = "";
        await pintarDiario();
      } catch (error) {
        avisar("No se ha podido anotar: " + (error.code || error.message));
        evento.currentTarget.disabled = false;
      }
    });

    caja.querySelector("#comoReceta").addEventListener("click", async (evento) => {
      // Nada de prompt(): los diálogos del navegador están bloqueados en Pages.
      const campo = caja.querySelector("#nombreReceta");
      const nombre = (campo.value || "").trim();
      if (!nombre) {
        campo.focus();
        avisar("Ponle un nombre a la receta antes de guardarla.");
        return;
      }
      evento.currentTarget.disabled = true;
      try {
        const total = sumar(items);
        const gramos = items.reduce((a, i) => a + (i.gramos || 0), 0) || 1;
        await guardarReceta(usuario().uid, {
          nombre,
          ingredientes: items,
          gramosTotales: gramos,
          por100: {
            kcal: Math.round((total.kcal / gramos) * 100),
            proteina: Math.round((total.proteina / gramos) * 1000) / 10,
            hidratos: Math.round((total.hidratos / gramos) * 1000) / 10,
            grasa: Math.round((total.grasa / gramos) * 1000) / 10
          }
        });
        evento.currentTarget.textContent = "Receta guardada";
      } catch (error) {
        avisar("No se ha podido guardar la receta: " + (error.code || error.message));
        evento.currentTarget.disabled = false;
      }
    });
  };

  pintar();
}

/* ---------------- Código de barras ---------------- */

function panelBarras(panel) {
  panel.innerHTML = `
    <div id="zonaEscaner"></div>
    <button class="boton boton--principal" id="escanear">Escanear en vivo</button>
    <input type="file" id="fotoCodigo" accept="image/*" capture="environment" hidden>
    <button class="boton" id="porFoto" style="margin-top:10px">Foto del código</button>
    <p class="nota">Si el escaneo en vivo se resiste, tira de la foto: la cámara del
    sistema enfoca mejor de cerca y lee a la primera.</p>
    <div class="campo" style="margin-top:14px">
      <label for="manual">…o teclea el código</label>
      <div class="fila">
        <input type="number" id="manual" inputmode="numeric" placeholder="8412345678905">
        <button class="boton" id="buscarCodigo">Buscar</button>
      </div>
    </div>
  `;

  panel.querySelector("#escanear").addEventListener("click", conCamara);

  const foto = panel.querySelector("#fotoCodigo");
  panel.querySelector("#porFoto").addEventListener("click", () => foto.click());
  foto.addEventListener("change", async () => {
    if (!foto.files || !foto.files[0]) return;
    avisar("Leyendo el código…");
    try {
      const ean = await leerDeFoto(foto.files[0]);
      if (!ean) {
        avisar("No se ve el código en esa foto. Acércate más y que salga recto y nítido.");
        return;
      }
      avisar("");
      resolverCodigo(ean);
    } finally {
      foto.value = "";
    }
  });
  panel.querySelector("#buscarCodigo").addEventListener("click", () => {
    const ean = panel.querySelector("#manual").value.trim();
    if (ean) resolverCodigo(ean);
  });
}

async function conCamara() {
  const zona = caja.querySelector("#zonaEscaner");
  zona.innerHTML = `
    <video class="visor" id="visor" playsinline muted></video>
    <button class="boton" id="cancelar" style="margin-bottom:14px">Cancelar</button>
  `;
  zona.querySelector("#cancelar").addEventListener("click", detener);
  avisar("");
  try {
    const ean = await escanear(zona.querySelector("#visor"), avisar);
    zona.innerHTML = "";
    if (ean) resolverCodigo(ean);
  } catch (error) {
    zona.innerHTML = "";
    avisar(
      error.name === "NotAllowedError"
        ? "Sin permiso de cámara. Puedes teclear el código a mano."
        : "No se ha podido abrir la cámara: " + error.message
    );
  }
}

async function resolverCodigo(ean) {
  const uid = usuario().uid;
  avisar("Buscando…");
  try {
    let producto = await leerProducto(uid, ean);
    const deCache = Boolean(producto);
    if (!producto) {
      producto = await buscar(ean);
      if (producto && !producto.incompleto) await guardarProducto(uid, producto);
    }
    avisar("");

    if (!producto || producto.incompleto) {
      caja.querySelector("#ficha").innerHTML = `
        <div class="tarjeta">
          <p class="etiqueta">Código ${ean}</p>
          <p>${
            producto
              ? "Está en la base de datos pero sin información nutricional."
              : "No está en la base de datos."
          } Puedes hacerle una foto a la etiqueta desde la pestaña Foto.</p>
        </div>`;
      return;
    }
    fichaProducto(producto, deCache);
  } catch (error) {
    avisar("No se ha podido consultar: " + error.message);
  }
}

function fichaProducto(producto, deCache) {
  const raciones = [];
  if (producto.racionGramos)
    raciones.push([producto.racionGramos, `1 ración (${producto.racionGramos} g)`]);
  if (producto.envaseGramos) {
    raciones.push([producto.envaseGramos, `Envase (${producto.envaseGramos} g)`]);
    raciones.push([
      Math.round(producto.envaseGramos / 2),
      `Medio (${Math.round(producto.envaseGramos / 2)} g)`
    ]);
  }

  let gramos = producto.racionGramos || 100;

  caja.querySelector("#ficha").innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">${producto.marca || "Sin marca"}${deCache ? " · ya guardado" : ""}</p>
      <p class="titulillo">${producto.nombre}</p>
      <div class="paso" style="margin-top:14px">
        <button type="button" class="paso__b" data-delta="-10">−</button>
        <input class="paso__v numero" type="number" id="gramos" inputmode="numeric"
               min="1" max="3000" value="${gramos}">
        <button type="button" class="paso__b" data-delta="10">+</button>
      </div>
      ${
        raciones.length
          ? `<div class="chips" style="margin-top:12px">${raciones
              .map(([g, t]) => `<button type="button" class="chip" data-gramos="${g}">${t}</button>`)
              .join("")}</div>`
          : ""
      }
      <div id="calculo"></div>
      <button class="boton boton--principal" id="anotar" style="margin-top:14px">Anotar</button>
    </div>
  `;

  const entrada = caja.querySelector("#gramos");
  const refrescar = () => {
    gramos = Math.max(1, Math.min(3000, Number(entrada.value) || 0));
    const m = paraCantidad(producto.por100, gramos);
    caja.querySelector("#calculo").innerHTML = `
      <p class="cifra numero">${m.kcal}<span> kcal</span></p>
      <div class="macros">
        <span><i style="background:var(--proteina)"></i>${m.proteina} g proteína</span>
        <span><i style="background:var(--hidratos)"></i>${m.hidratos} g hidratos</span>
        <span><i style="background:var(--grasa)"></i>${m.grasa} g grasa</span>
      </div>`;
  };

  entrada.addEventListener("input", refrescar);
  caja.querySelectorAll("[data-delta]").forEach((boton) =>
    boton.addEventListener("click", () => {
      entrada.value = Math.max(1, (Number(entrada.value) || 0) + Number(boton.dataset.delta));
      refrescar();
    })
  );
  caja.querySelectorAll("[data-gramos]").forEach((chip) =>
    chip.addEventListener("click", () => {
      entrada.value = chip.dataset.gramos;
      refrescar();
    })
  );
  refrescar();

  caja.querySelector("#anotar").addEventListener("click", async (evento) => {
    evento.currentTarget.disabled = true;
    try {
      const m = paraCantidad(producto.por100, gramos);
      await guardarEntrada(usuario().uid, {
        origen: "barras",
        fecha: fechaLocal(),
        hora: horaLocal(),
        items: [{ nombre: producto.nombre, gramos, ...m }],
        totales: m
      });
      caja.querySelector("#ficha").innerHTML = "";
      await pintarDiario();
    } catch (error) {
      avisar("No se ha podido anotar: " + (error.code || error.message));
      evento.currentTarget.disabled = false;
    }
  });
}

/* ---------------- Recetas ---------------- */

async function panelRecetas(panel) {
  panel.innerHTML = `<p class="nota" style="margin-top:0">Cargando…</p>`;
  try {
    const recetas = await leerRecetas(usuario().uid);
    if (!recetas.length) {
      panel.innerHTML = `<p class="vacio" style="margin-top:0">
        <strong>Todavía no hay recetas.</strong>
        Analiza un plato con la foto, corrige los gramos y guárdalo como receta.
        La próxima vez lo anotas de un toque.</p>`;
      return;
    }
    panel.innerHTML = recetas
      .map(
        (r) => `<button class="boton linea" data-receta="${r.id}" style="margin-bottom:10px">
          <span>${r.nombre}</span>
          <span class="etiqueta">${r.por100.kcal} kcal/100 g</span>
        </button>`
      )
      .join("");

    panel.querySelectorAll("[data-receta]").forEach((boton) =>
      boton.addEventListener("click", () => {
        const receta = recetas.find((r) => r.id === boton.dataset.receta);
        fichaProducto(
          {
            nombre: receta.nombre,
            marca: "Receta propia",
            por100: receta.por100,
            racionGramos: receta.gramosTotales
          },
          true
        );
      })
    );
  } catch (error) {
    panel.innerHTML = `<p class="aviso">No se han podido leer las recetas: ${error.message}</p>`;
  }
}

/* ---------------- Diario ---------------- */

async function pintarDiario() {
  const uid = usuario().uid;
  const zona = caja.querySelector("#diario");
  try {
    const entradas = await leerEntradasDelDia(uid, fechaLocal());
    if (!entradas.length) {
      zona.innerHTML = `<p class="vacio">Hoy no has registrado nada todavía.</p>`;
      return;
    }

    const suma = sumar(entradas.map((e) => e.totales || {}));

    zona.innerHTML = `
      <div class="tarjeta">
        <p class="etiqueta">Hoy llevas</p>
        <p class="cifra numero">${Math.round(suma.kcal)}<span> kcal</span></p>
        <div class="macros">
          <span><i style="background:var(--proteina)"></i>${Math.round(suma.proteina)} g proteína</span>
          <span><i style="background:var(--hidratos)"></i>${Math.round(suma.hidratos)} g hidratos</span>
          <span><i style="background:var(--grasa)"></i>${Math.round(suma.grasa)} g grasa</span>
        </div>
      </div>
      ${entradas
        .map(
          (e) => `<div class="tarjeta linea">
            <div>
              <p class="titulillo">${
                e.items?.length > 1
                  ? `${e.items[0].nombre} y ${e.items.length - 1} más`
                  : e.items?.[0]?.nombre || "Entrada"
              }</p>
              <p class="etiqueta">${e.hora || ""} · ${Math.round(e.totales?.kcal || 0)} kcal</p>
            </div>
            <button class="iconico" data-borrar="${e.id}" aria-label="Borrar">Borrar</button>
          </div>`
        )
        .join("")}
    `;

    zona.querySelectorAll("[data-borrar]").forEach((boton) =>
      boton.addEventListener("click", async () => {
        boton.disabled = true;
        await borrarEntrada(uid, boton.dataset.borrar);
        await pintarDiario();
      })
    );
  } catch (error) {
    zona.innerHTML = `<p class="aviso">No se ha podido leer el diario: ${
      error.code || error.message
    }</p>`;
  }
}
