// Buscador de alimentos. Escribes un nombre, eliges de la lista, pones los
// gramos y te calcula calorías y macros.
//
// Tres fuentes, por orden: la tabla genérica embebida (instantánea), la
// biblioteca de la consulta (ya cargada en memoria) y Open Food Facts. La
// tercera solo se consulta si las dos primeras no dan nada o si se pide
// expresamente, porque es lenta y devuelve productos de marca.
//
// No sabe nada de menús ni de pacientes: recibe dónde pintarse y a quién
// avisar cuando el usuario añade algo. Así sirve igual para la consola que
// para la pantalla de registro de comida el día que se quiera usar allí.

import { buscarEnTabla, buscarEnLista, porCantidad } from "../core/alimentos.js";
import { buscarTexto } from "../services/barcodes.js";

const ESPERA = 250; // ms sin teclear antes de buscar

export function montarBuscador({ destino, biblioteca = [], alAñadir, alGuardarNuevo }) {
  let seleccion = null;
  let reloj = null;
  let ultimoTermino = "";

  destino.innerHTML = `
    <div class="buscador">
      <input class="buscador__campo" type="text" autocomplete="off"
        placeholder="Escribe un alimento: merluza, arroz, aceite…">
      <div class="buscador__lista oculto"></div>
      <div class="buscador__elegido oculto"></div>
      <p class="nota buscador__aviso"></p>
    </div>`;

  const campo = destino.querySelector(".buscador__campo");
  const lista = destino.querySelector(".buscador__lista");
  const elegido = destino.querySelector(".buscador__elegido");
  const aviso = destino.querySelector(".buscador__aviso");

  /* ---------- resultados ---------- */

  function pintarResultados(resultados, { buscandoFuera = false } = {}) {
    if (!resultados.length && !buscandoFuera) {
      lista.innerHTML = `
        <p class="vacio">Sin resultados para «${ultimoTermino}».</p>
        <button class="boton" data-nuevo="1">Añadirlo con sus macros</button>`;
      lista.classList.remove("oculto");
    } else {
      lista.innerHTML =
        resultados
          .map(
            (a, i) => `<button class="buscador__fila" data-elegir="${i}">
              <span class="fila__texto">
                <b>${a.nombre}${a.marca ? ` · ${a.marca}` : ""}</b>
                <em>${a.por100.kcal} kcal · P ${a.por100.proteina} · H ${
              a.por100.hidratos
            } · G ${a.por100.grasa} por 100 g${etiquetaOrigen(a.origen)}</em>
              </span>
            </button>`
          )
          .join("") +
        (buscandoFuera
          ? `<p class="vacio">Buscando marcas en Open Food Facts…</p>`
          : `<div class="buscador__pie">
              <button class="boton" data-marcas="1">Buscar marcas</button>
              <button class="boton" data-nuevo="1">No está: añadirlo</button>
             </div>`);
      lista.classList.remove("oculto");
    }

    lista.querySelectorAll("[data-elegir]").forEach((b) =>
      b.addEventListener("click", () => elegir(resultados[Number(b.dataset.elegir)]))
    );
    const marcas = lista.querySelector("[data-marcas]");
    if (marcas) marcas.addEventListener("click", () => buscarFuera(resultados));
    const nuevo = lista.querySelector("[data-nuevo]");
    if (nuevo) nuevo.addEventListener("click", pintarNuevo);
  }

  function etiquetaOrigen(origen) {
    if (origen === "biblioteca") return " · tu biblioteca";
    if (origen === "off") return " · Open Food Facts";
    return "";
  }

  async function buscar(termino) {
    ultimoTermino = termino;
    const propios = [
      ...buscarEnLista(biblioteca, termino),
      ...buscarEnTabla(termino)
    ];

    if (propios.length) {
      pintarResultados(propios);
      return;
    }

    // Nada en casa: se prueba fuera sin que haya que pedirlo.
    pintarResultados([], { buscandoFuera: true });
    const fuera = await buscarTexto(termino);
    if (ultimoTermino !== termino) return; // ha seguido escribiendo
    pintarResultados(fuera);
  }

  async function buscarFuera(previos) {
    pintarResultados(previos, { buscandoFuera: true });
    const fuera = await buscarTexto(ultimoTermino);
    pintarResultados([...previos, ...fuera]);
  }

  /* ---------- alimento elegido ---------- */

  function elegir(alimento) {
    seleccion = alimento;
    lista.classList.add("oculto");
    campo.value = alimento.nombre;
    pintarElegido(100);
  }

  function pintarElegido(gramos) {
    const m = porCantidad(seleccion, gramos);
    elegido.classList.remove("oculto");
    elegido.innerHTML = `
      <div class="campo campo--linea">
        <input class="buscador__gramos" type="number" inputmode="numeric" min="1"
          step="5" value="${gramos}" aria-label="Gramos">
        <span class="etiqueta">g de ${seleccion.nombre}</span>
      </div>
      <div class="macros">
        <span><b>${m.kcal}</b> kcal</span>
        <span><i style="background:var(--proteina)"></i>${m.proteina} g</span>
        <span><i style="background:var(--hidratos)"></i>${m.hidratos} g</span>
        <span><i style="background:var(--grasa)"></i>${m.grasa} g</span>
      </div>
      <div class="campo campo--linea">
        <button class="boton boton--principal" data-anadir="1">Añadir a la comida</button>
        <button class="boton" data-cancelar="1">Cambiar</button>
      </div>`;

    const gramosCampo = elegido.querySelector(".buscador__gramos");
    gramosCampo.addEventListener("input", () => {
      const g = Number(gramosCampo.value) || 0;
      const n = porCantidad(seleccion, g);
      elegido.querySelector(".macros").innerHTML = `
        <span><b>${n.kcal}</b> kcal</span>
        <span><i style="background:var(--proteina)"></i>${n.proteina} g</span>
        <span><i style="background:var(--hidratos)"></i>${n.hidratos} g</span>
        <span><i style="background:var(--grasa)"></i>${n.grasa} g</span>`;
    });

    elegido.querySelector("[data-anadir]").addEventListener("click", () => {
      const g = Number(elegido.querySelector(".buscador__gramos").value) || 0;
      if (g <= 0) {
        aviso.textContent = "Pon los gramos.";
        return;
      }
      const m = porCantidad(seleccion, g);
      alAñadir({
        alimento: seleccion.nombre,
        g,
        kcal: m.kcal,
        proteina: m.proteina,
        hidratos: m.hidratos,
        grasa: m.grasa,
        por100: seleccion.por100
      });
      limpiar();
    });

    elegido.querySelector("[data-cancelar]").addEventListener("click", limpiar);
  }

  /* ---------- alta manual ---------- */

  function pintarNuevo() {
    lista.classList.add("oculto");
    elegido.classList.remove("oculto");
    elegido.innerHTML = `
      <p class="titulillo">Alimento nuevo, por 100 g</p>
      <label class="campo">Nombre
        <input class="nuevo__nombre" type="text" value="${ultimoTermino}">
      </label>
      <div class="campo campo--linea">
        <input class="nuevo__kcal" type="number" inputmode="numeric" placeholder="kcal" min="0">
        <input class="nuevo__p" type="number" inputmode="decimal" placeholder="prot" min="0" step="0.1">
        <input class="nuevo__h" type="number" inputmode="decimal" placeholder="hidr" min="0" step="0.1">
        <input class="nuevo__g" type="number" inputmode="decimal" placeholder="grasa" min="0" step="0.1">
      </div>
      <label class="campo campo--casilla">
        <input class="nuevo__guardar" type="checkbox" checked>
        Guardarlo en mi biblioteca
      </label>
      <div class="campo campo--linea">
        <button class="boton boton--principal" data-crear="1">Usar este alimento</button>
        <button class="boton" data-cancelar="1">Cancelar</button>
      </div>`;

    elegido.querySelector("[data-cancelar]").addEventListener("click", limpiar);
    elegido.querySelector("[data-crear]").addEventListener("click", async () => {
      const nombre = elegido.querySelector(".nuevo__nombre").value.trim();
      const kcal = Number(elegido.querySelector(".nuevo__kcal").value);
      if (!nombre || !Number.isFinite(kcal) || kcal <= 0) {
        aviso.textContent = "Hacen falta el nombre y las calorías por 100 g.";
        return;
      }

      const alimento = {
        nombre,
        origen: "biblioteca",
        por100: {
          kcal,
          proteina: Number(elegido.querySelector(".nuevo__p").value) || 0,
          hidratos: Number(elegido.querySelector(".nuevo__h").value) || 0,
          grasa: Number(elegido.querySelector(".nuevo__g").value) || 0
        }
      };

      if (elegido.querySelector(".nuevo__guardar").checked && alGuardarNuevo) {
        try {
          await alGuardarNuevo(alimento);
          biblioteca.push(alimento);
          aviso.textContent = "Guardado en tu biblioteca.";
        } catch (error) {
          aviso.textContent = "No se ha podido guardar, pero puedes usarlo aquí.";
        }
      }

      elegir(alimento);
    });
  }

  function limpiar() {
    seleccion = null;
    elegido.classList.add("oculto");
    elegido.innerHTML = "";
    lista.classList.add("oculto");
    campo.value = "";
    aviso.textContent = "";
    campo.focus();
  }

  /* ---------- entrada ---------- */

  campo.addEventListener("input", () => {
    clearTimeout(reloj);
    const termino = campo.value.trim();
    elegido.classList.add("oculto");
    if (termino.length < 2) {
      lista.classList.add("oculto");
      return;
    }
    reloj = setTimeout(() => buscar(termino), ESPERA);
  });

  return { limpiar };
}
