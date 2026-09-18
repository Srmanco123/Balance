// Ficha del paciente vista por el profesional. Cuatro bloques: objetivo,
// menú, mensajes y logros. El sujeto ya está fijado por app.js antes de montar.

import {
  leerPaciente,
  actualizarPaciente,
  leerPerfil,
  guardarPerfil,
  leerPesos,
  leerMenu,
  guardarMenu,
  leerDietas,
  guardarDieta,
  leerMensajes,
  enviarMensaje,
  leerLogros,
  guardarLogro
} from "../data/repo.js";
import { sujeto } from "../data/sesion.js";
import { repartoMacros } from "../core/formulas.js";
import { tendenciaActual, ritmoSemanal } from "../core/tendencia.js";

export const titulo = "Ficha";

const RIGIDEZ = {
  exacto: ["Gramos exactos", "Pesa lo que pone. Si un día no puede, que registre lo que coma."],
  intercambio: ["Con intercambios", "Puede cambiar los alimentos marcados por sus equivalentes."],
  flexible: ["Guía flexible", "Sin gramos. Raciones de referencia y registro de lo que coma."]
};

const MENU_VACIO = {
  rigidez: "intercambio",
  comidas: [
    { nombre: "Desayuno", hora: "08:00", items: [], alternativa: "" },
    { nombre: "Comida", hora: "14:00", items: [], alternativa: "" },
    { nombre: "Cena", hora: "21:00", items: [], alternativa: "" }
  ]
};

let caja = null;
let ficha = null;
let perfil = null;
let menu = null;
let pesos = [];
let sub = "objetivo";

// app.js la usa para el aviso de "estás viendo la ficha de…".
export function nombreActivo() {
  return ficha ? ficha.nombre : null;
}

export function mount(zona) {
  caja = zona;
  sub = "objetivo";
  caja.innerHTML = `<p class="vacio" style="margin-top:0">Cargando ficha…</p>`;
  cargar().catch((error) => {
    caja.innerHTML = `<p class="aviso">No se ha podido cargar la ficha: ${
      error.code || error.message
    }</p>`;
  });
}

export function unmount() {
  caja = null;
  ficha = null;
  perfil = null;
  menu = null;
  pesos = [];
}

async function cargar() {
  const s = sujeto();
  const [f, pf, mn, ps] = await Promise.all([
    leerPaciente(s),
    leerPerfil(s),
    leerMenu(s),
    leerPesos(s, 60)
  ]);
  ficha = f || { nombre: "Sin nombre" };
  perfil = pf;
  menu = mn || JSON.parse(JSON.stringify(MENU_VACIO));
  pesos = ps;
  pintar();
}

function pesoRef() {
  return (perfil && perfil.peso) || ficha.pesoRef || null;
}

function objetivoVigente() {
  return (perfil && perfil.objetivoKcal) || null;
}

function kcalMenu() {
  return menu.comidas.reduce(
    (t, c) => t + c.items.reduce((s, i) => s + (Number(i.kcal) || 0), 0),
    0
  );
}

function pintar() {
  const tendencia = tendenciaActual(pesos);
  const ritmo = ritmoSemanal(pesos);

  caja.innerHTML = `
    <div class="tarjeta">
      <p class="etiqueta">${ficha.nombre}</p>
      <div class="tresColumnas">
        <div>
          <p class="dato numero">${tendencia ? tendencia.toFixed(1).replace(".", ",") : "–"}</p>
          <p class="etiqueta">kg de tendencia</p>
        </div>
        <div>
          <p class="dato numero">${
            ritmo ? (ritmo > 0 ? "+" : "") + ritmo.toFixed(2).replace(".", ",") : "–"
          }</p>
          <p class="etiqueta">kg por semana</p>
        </div>
        <div>
          <p class="dato numero">${ficha.adherencia != null ? ficha.adherencia + "%" : "–"}</p>
          <p class="etiqueta">adherencia</p>
        </div>
      </div>
      <p class="nota">${
        perfil
          ? `${pesos.length} registros de peso. Objetivo vigente ${
              objetivoVigente() || "sin pautar"
            }${objetivoVigente() ? " kcal" : ""}.`
          : "Este paciente todavía no ha dado sus datos de partida, así que no hay peso ni tendencia. Puedes pautarle el objetivo de todos modos."
      }</p>
    </div>

    <div class="segmentos" id="sub">
      ${["objetivo", "menu", "mensajes", "logros"]
        .map(
          (s) =>
            `<button data-sub="${s}" ${sub === s ? 'aria-current="true"' : ""}>${
              { objetivo: "Objetivo", menu: "Menú", mensajes: "Mensajes", logros: "Logros" }[s]
            }</button>`
        )
        .join("")}
    </div>

    <div id="cuerpo"></div>`;

  caja.querySelectorAll("[data-sub]").forEach((b) =>
    b.addEventListener("click", () => {
      sub = b.dataset.sub;
      pintar();
    })
  );

  const cuerpo = caja.querySelector("#cuerpo");
  if (sub === "objetivo") pintarObjetivo(cuerpo);
  if (sub === "menu") pintarMenu(cuerpo);
  if (sub === "mensajes") pintarMensajes(cuerpo);
  if (sub === "logros") pintarLogros(cuerpo);
}

/* ---------------- Objetivo ---------------- */
// Se escriben los mismos campos que ya lee hoy.js: objetivoKcal, y los
// factores de proteína y grasa por kilo desde los que sale el reparto. Así la
// pantalla del paciente no cambia ni una línea.

function pintarObjetivo(zona) {
  const kcal = objetivoVigente() || 2000;
  const pk = (perfil && perfil.proteinaPorKilo) || 2;
  const gk = (perfil && perfil.grasaPorKilo) || 0.8;

  zona.innerHTML = `
    <div class="tarjeta">
      <p class="titulillo">Objetivo diario</p>
      <label class="campo">Calorías
        <input id="kcal" type="number" inputmode="numeric" min="800" max="6000" step="10" value="${kcal}">
      </label>
      <label class="campo">Proteína por kilo de peso
        <input id="pk" type="number" inputmode="decimal" min="1" max="3.5" step="0.1" value="${pk}">
      </label>
      <label class="campo">Grasa por kilo de peso
        <input id="gk" type="number" inputmode="decimal" min="0.4" max="1.5" step="0.05" value="${gk}">
      </label>
      <div id="reparto"></div>
      <button class="boton boton--principal" id="publicar">Publicar en su app</button>
      <p class="nota" id="avisoObj">${
        perfil && perfil.objetivoOrigen === "pautado"
          ? "Objetivo pautado por ti. El motor adaptativo no lo sobrescribe: si detecta desvío, te deja una sugerencia."
          : "Ahora mismo el objetivo lo calcula la app. Al publicar pasa a estar pautado por ti."
      }</p>
      ${
        perfil && perfil.sugerenciaKcal
          ? `<p class="nota aviso--suave">El motor sugiere ${perfil.sugerenciaKcal} kcal
             a partir del gasto medido (${perfil.sugerenciaGasto || "–"} kcal).</p>`
          : ""
      }
    </div>`;

  const refrescar = () => {
    const k = Number(zona.querySelector("#kcal").value) || 0;
    const p = Number(zona.querySelector("#pk").value) || 0;
    const g = Number(zona.querySelector("#gk").value) || 0;
    const peso = pesoRef();
    const destino = zona.querySelector("#reparto");

    if (!peso) {
      destino.innerHTML = `<p class="nota">Sin peso de referencia no se puede repartir en gramos.
        En cuanto registre su primer peso aparecerá aquí.</p>`;
      return;
    }
    const m = repartoMacros(k, { peso, proteinaPorKilo: p, grasaPorKilo: g });
    destino.innerHTML = `<div class="macros">
      <span><i style="background:var(--proteina)"></i>${m.proteina} g proteína</span>
      <span><i style="background:var(--hidratos)"></i>${m.hidratos} g hidratos</span>
      <span><i style="background:var(--grasa)"></i>${m.grasa} g grasa</span>
    </div>`;
  };

  ["kcal", "pk", "gk"].forEach((id) =>
    zona.querySelector("#" + id).addEventListener("input", refrescar)
  );
  refrescar();

  zona.querySelector("#publicar").addEventListener("click", async (e) => {
    const boton = e.currentTarget;
    const aviso = zona.querySelector("#avisoObj");
    boton.disabled = true;
    aviso.textContent = "Publicando…";
    try {
      await guardarPerfil(sujeto(), {
        objetivoKcal: Number(zona.querySelector("#kcal").value),
        objetivoOrigen: "pautado",
        objetivoDesde: new Date().toISOString().slice(0, 10),
        proteinaPorKilo: Number(zona.querySelector("#pk").value),
        grasaPorKilo: Number(zona.querySelector("#gk").value)
      });
      perfil = await leerPerfil(sujeto());
      aviso.textContent = "Publicado. Ya lo ve en su app.";
    } catch (error) {
      aviso.textContent = "No se ha podido publicar: " + (error.code || error.message);
    }
    boton.disabled = false;
  });
}

/* ---------------- Menú ---------------- */

function pintarMenu(zona) {
  const kc = kcalMenu();
  const obj = objetivoVigente();
  const desvio = obj ? kc - obj : null;
  const flex = menu.rigidez === "flexible";

  zona.innerHTML = `
    <div class="tarjeta">
      <p class="titulillo">Cómo pautas a este paciente</p>
      <div class="segmentos" id="rig">
        ${Object.keys(RIGIDEZ)
          .map(
            (r) =>
              `<button data-rig="${r}" ${
                menu.rigidez === r ? 'aria-current="true"' : ""
              }>${RIGIDEZ[r][0]}</button>`
          )
          .join("")}
      </div>
      <p class="nota">${RIGIDEZ[menu.rigidez][1]}</p>
    </div>

    ${menu.comidas
      .map(
        (c, ci) => `
      <div class="tarjeta">
        <div class="ingrediente__cabeza">
          <b>${c.nombre}</b><span class="etiqueta">${c.hora}</span>
        </div>
        ${
          c.items.length
            ? c.items
                .map(
                  (i, ii) => `<div class="fila fila--item">
              <span class="fila__texto"><b>${i.alimento}</b>
                <em>${flex ? "ración" : (i.g || 0) + " g"}${
                    flex || !i.kcal ? "" : " · " + i.kcal + " kcal"
                  }</em></span>
              <button class="iconico" data-quitar="${ci}:${ii}" aria-label="Quitar">×</button>
            </div>`
                )
                .join("")
            : `<p class="vacio">Sin alimentos.</p>`
        }
        <div class="campo campo--linea">
          <input data-al="${ci}" type="text" placeholder="Alimento">
          <input data-g="${ci}" type="number" inputmode="numeric" placeholder="g" min="0">
          <input data-k="${ci}" type="number" inputmode="numeric" placeholder="kcal" min="0">
          <button class="boton" data-añadir="${ci}">Añadir</button>
        </div>
        ${
          menu.rigidez !== "exacto"
            ? `<label class="campo">Intercambio permitido
                <input data-alt="${ci}" type="text" value="${c.alternativa || ""}"
                  placeholder="Cambia el pollo por 200 g de merluza">
              </label>`
            : ""
        }
      </div>`
      )
      .join("")}

    <div class="tarjeta">
      <button class="boton" id="añadirComida">Añadir comida</button>
      <p class="titulillo" style="margin-top:16px">Cuadre</p>
      <p class="cifra numero">${kc}<span> kcal en el menú</span></p>
      <p class="nota">${
        obj
          ? Math.abs(desvio) <= 120
            ? `Cuadra con el objetivo de ${obj} kcal.`
            : `Desvío de ${desvio > 0 ? "+" : ""}${desvio} kcal sobre el objetivo de ${obj}.`
          : "Este paciente no tiene objetivo pautado todavía."
      }</p>
      ${
        flex
          ? `<p class="nota">En guía flexible las kcal del menú son orientativas: al paciente
             no se le muestran.</p>`
          : ""
      }
      <button class="boton boton--principal" id="publicarMenu">Publicar el menú</button>
      <div class="campo campo--linea" style="margin-top:12px">
        <input id="nombrePlantilla" type="text" placeholder="Nombre de la plantilla">
        <button class="boton" id="guardarPlantilla">Guardar como plantilla</button>
      </div>
      <div class="campo" id="desdePlantilla"></div>
      <p class="nota" id="avisoMenu"></p>
    </div>`;

  zona.querySelectorAll("[data-rig]").forEach((b) =>
    b.addEventListener("click", () => {
      menu.rigidez = b.dataset.rig;
      pintar();
    })
  );

  zona.querySelectorAll("[data-quitar]").forEach((b) =>
    b.addEventListener("click", () => {
      const [ci, ii] = b.dataset.quitar.split(":").map(Number);
      menu.comidas[ci].items.splice(ii, 1);
      pintar();
    })
  );

  zona.querySelectorAll("[data-añadir]").forEach((b) =>
    b.addEventListener("click", () => {
      const ci = Number(b.dataset.añadir);
      const al = zona.querySelector(`[data-al="${ci}"]`).value.trim();
      if (!al) return;
      menu.comidas[ci].items.push({
        alimento: al,
        g: Number(zona.querySelector(`[data-g="${ci}"]`).value) || 0,
        kcal: Number(zona.querySelector(`[data-k="${ci}"]`).value) || 0
      });
      pintar();
    })
  );

  zona.querySelectorAll("[data-alt]").forEach((i) =>
    i.addEventListener("change", () => {
      menu.comidas[Number(i.dataset.alt)].alternativa = i.value.trim();
    })
  );

  zona.querySelector("#añadirComida").addEventListener("click", () => {
    menu.comidas.push({ nombre: "Nueva comida", hora: "18:00", items: [], alternativa: "" });
    pintar();
  });

  zona.querySelector("#publicarMenu").addEventListener("click", async (e) => {
    const aviso = zona.querySelector("#avisoMenu");
    e.currentTarget.disabled = true;
    aviso.textContent = "Publicando…";
    try {
      await guardarMenu(sujeto(), menu);
      aviso.textContent = "Menú publicado. Ya lo ve en Mi dieta.";
    } catch (error) {
      aviso.textContent = "No se ha podido publicar: " + (error.code || error.message);
    }
    e.currentTarget.disabled = false;
  });

  zona.querySelector("#guardarPlantilla").addEventListener("click", async () => {
    const aviso = zona.querySelector("#avisoMenu");
    const nombre = zona.querySelector("#nombrePlantilla").value.trim();
    if (!nombre) {
      aviso.textContent = "Ponle nombre a la plantilla.";
      return;
    }
    try {
      await guardarDieta({ nombre, rigidez: menu.rigidez, comidas: menu.comidas });
      aviso.textContent = "Guardada en tus plantillas de dieta.";
    } catch (error) {
      aviso.textContent = "No se ha podido guardar: " + (error.code || error.message);
    }
  });

  // Cargar una plantilla existente sobre este paciente.
  leerDietas()
    .then((dietas) => {
      const destino = zona.querySelector("#desdePlantilla");
      if (!destino || !dietas.length) return;
      destino.innerHTML = `<span class="etiqueta">Cargar una plantilla</span>
        <div class="chips">${dietas
          .map((d) => `<button class="chip" data-cargar="${d.id}">${d.nombre}</button>`)
          .join("")}</div>`;
      destino.querySelectorAll("[data-cargar]").forEach((b) =>
        b.addEventListener("click", () => {
          const d = dietas.find((x) => x.id === b.dataset.cargar);
          menu = { rigidez: d.rigidez || "intercambio", comidas: JSON.parse(JSON.stringify(d.comidas || [])) };
          pintar();
        })
      );
    })
    .catch(() => {});
}

/* ---------------- Mensajes ---------------- */

function pintarMensajes(zona) {
  zona.innerHTML = `<p class="vacio">Cargando…</p>`;
  leerMensajes(sujeto())
    .then((mensajes) => {
      zona.innerHTML = `
        <div class="tarjeta">
          <div class="historial hilo">
            ${
              mensajes.length
                ? mensajes
                    .map(
                      (m) => `<p class="burbuja ${m.dePro ? "burbuja--mia" : "burbuja--suya"}">
                  ${m.texto}</p>`
                    )
                    .join("")
                : `<p class="vacio">Todavía no hay mensajes.</p>`
            }
          </div>
          <div class="campo campo--linea">
            <input id="texto" type="text" placeholder="Escribe a tu paciente">
            <button class="boton boton--principal" id="enviar">Enviar</button>
          </div>
          <p class="nota" id="avisoMsg">El hilo no se puede editar ni borrar: puede formar parte
            de la historia clínica.</p>
        </div>`;

      const mandar = async () => {
        const campo = zona.querySelector("#texto");
        const texto = campo.value.trim();
        if (!texto) return;
        campo.disabled = true;
        try {
          await enviarMensaje(sujeto(), texto);
          campo.value = "";
          pintarMensajes(zona);
        } catch (error) {
          zona.querySelector("#avisoMsg").textContent =
            "No se ha podido enviar: " + (error.code || error.message);
        }
        campo.disabled = false;
      };

      zona.querySelector("#enviar").addEventListener("click", mandar);
      zona.querySelector("#texto").addEventListener("keydown", (e) => {
        if (e.key === "Enter") mandar();
      });
    })
    .catch((error) => {
      zona.innerHTML = `<p class="aviso">No se han podido cargar los mensajes: ${
        error.code || error.message
      }</p>`;
    });
}

/* ---------------- Logros ---------------- */
// PROVISIONAL: los concede el profesional a mano. Cuando el Worker esté
// desplegado pasan a ser escritura de servidor y esta vista queda de consulta.

function pintarLogros(zona) {
  zona.innerHTML = `<p class="vacio">Cargando…</p>`;
  leerLogros(sujeto())
    .then((logros) => {
      zona.innerHTML = `
        <div class="tarjeta">
          <div class="tresColumnas">
            <div>
              <p class="dato numero">${ficha.puntos || 0}</p>
              <p class="etiqueta">puntos</p>
            </div>
            <div>
              <p class="dato numero">${ficha.racha || 0}</p>
              <p class="etiqueta">días de racha</p>
            </div>
            <div>
              <p class="dato numero">${logros.filter((l) => l.conseguida).length}/${logros.length}</p>
              <p class="etiqueta">medallas</p>
            </div>
          </div>
        </div>

        <div class="historial">
          ${
            logros.length
              ? logros
                  .map(
                    (l) => `<button class="fila fila--logro ${
                      l.conseguida ? "" : "fila--bloqueada"
                    }" data-alternar="${l.id}">
              <span class="fila__texto"><b>${l.nombre}</b><em>${l.nota || ""} · ${
                      l.puntos || 0
                    } puntos</em></span>
              <span class="chip ${l.conseguida ? "chip--bien" : ""}">${
                      l.conseguida ? "Conseguida" : "Pendiente"
                    }</span>
            </button>`
                  )
                  .join("")
              : `<p class="vacio">Sin recompensas definidas.</p>`
          }
        </div>

        <div class="tarjeta">
          <p class="titulillo">Nueva recompensa</p>
          <label class="campo">Nombre
            <input id="nomLogro" type="text" placeholder="Racha de 7 días">
          </label>
          <div class="campo campo--linea">
            <input id="notaLogro" type="text" placeholder="Qué la desbloquea">
            <input id="ptsLogro" type="number" inputmode="numeric" placeholder="puntos" min="0" value="70">
            <button class="boton" id="crearLogro">Crear</button>
          </div>
          <p class="nota" id="avisoLogro">Mientras el Worker no esté desplegado, las medallas las
            concedes tú. Después las otorgará el servidor: una medalla que el propio paciente
            puede activarse no motiva a nadie.</p>
        </div>`;

      zona.querySelectorAll("[data-alternar]").forEach((b) =>
        b.addEventListener("click", async () => {
          const l = logros.find((x) => x.id === b.dataset.alternar);
          try {
            await guardarLogro(sujeto(), { conseguida: !l.conseguida }, l.id);
            const delta = (l.conseguida ? -1 : 1) * (l.puntos || 0);
            await actualizarPaciente(sujeto(), {
              puntos: Math.max(0, (ficha.puntos || 0) + delta)
            });
            ficha = await leerPaciente(sujeto());
            pintar();
          } catch (error) {
            zona.querySelector("#avisoLogro").textContent =
              "No se ha podido actualizar: " + (error.code || error.message);
          }
        })
      );

      zona.querySelector("#crearLogro").addEventListener("click", async () => {
        const nombre = zona.querySelector("#nomLogro").value.trim();
        if (!nombre) return;
        try {
          await guardarLogro(sujeto(), {
            nombre,
            nota: zona.querySelector("#notaLogro").value.trim(),
            puntos: Number(zona.querySelector("#ptsLogro").value) || 0,
            conseguida: false
          });
          pintarLogros(zona);
        } catch (error) {
          zona.querySelector("#avisoLogro").textContent =
            "No se ha podido crear: " + (error.code || error.message);
        }
      });
    })
    .catch((error) => {
      zona.innerHTML = `<p class="aviso">No se han podido cargar los logros: ${
        error.code || error.message
      }</p>`;
    });
}
