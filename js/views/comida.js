import { usuario } from "../data/firebase.js";
import {
  leerProducto,
  guardarProducto,
  guardarEntrada,
  leerEntradasDelDia,
  borrarEntrada
} from "../data/repo.js";
import { buscar, paraCantidad } from "../services/barcodes.js";
import { escanear, detener } from "../ui/escaner.js";
import { fechaLocal, horaLocal } from "../core/fechas.js";

export const titulo = "Comida";

let caja = null;

export function mount(contenedor) {
  caja = contenedor;
  contenedor.innerHTML = `
    <div id="zonaEscaner"></div>

    <div class="fila" style="margin-bottom:14px">
      <button class="boton boton--principal" id="escanear">Escanear código</button>
    </div>

    <div class="campo">
      <label for="manual">…o teclea el código de barras</label>
      <div class="fila">
        <input type="number" id="manual" inputmode="numeric" placeholder="8412345678905">
        <button class="boton" id="buscar">Buscar</button>
      </div>
    </div>

    <p class="aviso" id="aviso" role="alert"></p>
    <div id="ficha"></div>
    <div id="diario"></div>
  `;

  contenedor.querySelector("#escanear").addEventListener("click", conCamara);
  contenedor.querySelector("#buscar").addEventListener("click", () => {
    const ean = contenedor.querySelector("#manual").value.trim();
    if (ean) resolver(ean);
  });

  pintarDiario();
}

export function unmount() {
  detener();
  caja = null;
}

function avisar(texto) {
  caja.querySelector("#aviso").textContent = texto || "";
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
    const ean = await escanear(zona.querySelector("#visor"));
    zona.innerHTML = "";
    if (ean) resolver(ean);
  } catch (error) {
    zona.innerHTML = "";
    avisar(
      error.name === "NotAllowedError"
        ? "Sin permiso de cámara. Puedes teclear el código a mano."
        : "No se ha podido abrir la cámara: " + error.message
    );
  }
}

async function resolver(ean) {
  const uid = usuario().uid;
  avisar("Buscando…");
  try {
    let producto = await leerProducto(uid, ean);
    let deCache = Boolean(producto);

    if (!producto) {
      producto = await buscar(ean);
      if (producto && !producto.incompleto) await guardarProducto(uid, producto);
    }

    avisar("");

    if (!producto) {
      caja.querySelector("#ficha").innerHTML = `
        <div class="tarjeta">
          <p class="etiqueta">Código ${ean}</p>
          <p>No está en la base de datos. Puedes registrarlo como receta a partir
          de la etiqueta, o añadirlo tú a Open Food Facts para que lo tenga todo el mundo.</p>
        </div>`;
      return;
    }

    if (producto.incompleto) {
      caja.querySelector("#ficha").innerHTML = `
        <div class="tarjeta">
          <p class="etiqueta">Código ${ean}</p>
          <p>${producto.nombre || "Producto"} está en la base de datos, pero sin
          información nutricional. Habrá que meterlo a mano desde la etiqueta.</p>
        </div>`;
      return;
    }

    pintarFicha(producto, deCache);
  } catch (error) {
    avisar("No se ha podido consultar: " + error.message);
  }
}

function pintarFicha(producto, deCache) {
  const raciones = [];
  if (producto.racionGramos)
    raciones.push([producto.racionGramos, `1 ración (${producto.racionGramos} g)`]);
  if (producto.envaseGramos) {
    raciones.push([producto.envaseGramos, `Envase (${producto.envaseGramos} g)`]);
    raciones.push([
      Math.round(producto.envaseGramos / 2),
      `Medio envase (${Math.round(producto.envaseGramos / 2)} g)`
    ]);
  }

  let gramos = producto.racionGramos || 100;

  caja.querySelector("#ficha").innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">${producto.marca || "Sin marca"}${deCache ? " · ya guardado" : ""}</p>
      <p class="titulillo">${producto.nombre}</p>

      <div class="campo" style="margin-top:14px">
        <label for="gramos">Cantidad en gramos</label>
        <div class="paso">
          <button type="button" class="paso__b" data-delta="-10" aria-label="Quitar 10 gramos">−</button>
          <input class="paso__v numero" type="number" id="gramos" inputmode="numeric"
                 min="1" max="3000" step="1" value="${gramos}">
          <button type="button" class="paso__b" data-delta="10" aria-label="Añadir 10 gramos">+</button>
        </div>
      </div>

      ${
        raciones.length
          ? `<div class="chips">${raciones
              .map(
                ([g, t]) => `<button type="button" class="chip" data-gramos="${g}">${t}</button>`
              )
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
    const boton = evento.currentTarget;
    boton.disabled = true;
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
      caja.querySelector("#manual").value = "";
      await pintarDiario();
    } catch (error) {
      avisar("No se ha podido anotar: " + (error.code || error.message));
      boton.disabled = false;
    }
  });
}

async function pintarDiario() {
  const uid = usuario().uid;
  const hoy = fechaLocal();
  const zona = caja.querySelector("#diario");
  try {
    const entradas = await leerEntradasDelDia(uid, hoy);
    if (!entradas.length) {
      zona.innerHTML = `<p class="vacio">Hoy no has registrado nada todavía.</p>`;
      return;
    }

    const suma = entradas.reduce(
      (a, e) => ({
        kcal: a.kcal + (e.totales?.kcal || 0),
        proteina: a.proteina + (e.totales?.proteina || 0),
        hidratos: a.hidratos + (e.totales?.hidratos || 0),
        grasa: a.grasa + (e.totales?.grasa || 0)
      }),
      { kcal: 0, proteina: 0, hidratos: 0, grasa: 0 }
    );

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
              <p class="titulillo">${e.items?.[0]?.nombre || "Entrada"}</p>
              <p class="etiqueta">${e.hora || ""} · ${e.items?.[0]?.gramos || 0} g · ${Math.round(
            e.totales?.kcal || 0
          )} kcal</p>
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
