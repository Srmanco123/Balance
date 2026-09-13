import { usuario, salir } from "../data/firebase.js";
import { abrir, cerrar } from "../ui/camara.js";

export const titulo = "Ajustes";

export function mount(caja) {
  const u = usuario();

  caja.innerHTML = `
    <div class="tarjeta">
      <div class="dato"><span>Cuenta</span><code>${u ? u.email : "—"}</code></div>
      <div class="dato"><span>UID</span><code id="uid">${u ? u.uid : "—"}</code></div>
      <button class="boton" id="copiar" style="margin-top:12px">Copiar UID</button>
    </div>

    <div class="tarjeta">
      <video class="visor oculto" id="visor" playsinline muted></video>
      <button class="boton" id="camara">Probar la cámara</button>
      <p class="dato" id="estado" style="margin:12px 0 0"><span>Estado</span><code>sin probar</code></p>
    </div>

    <button class="boton" id="salir">Cerrar sesión</button>
  `;

  const estado = (texto) => {
    caja.querySelector("#estado code").textContent = texto;
  };

  caja.querySelector("#copiar").addEventListener("click", async () => {
    const uid = caja.querySelector("#uid").textContent;
    try {
      await navigator.clipboard.writeText(uid);
      caja.querySelector("#copiar").textContent = "UID copiado";
    } catch {
      caja.querySelector("#copiar").textContent = "Selecciónalo y cópialo a mano";
    }
  });

  const visor = caja.querySelector("#visor");
  const boton = caja.querySelector("#camara");

  boton.addEventListener("click", async () => {
    if (!visor.classList.contains("oculto")) {
      cerrar();
      visor.classList.add("oculto");
      boton.textContent = "Probar la cámara";
      estado("detenida");
      return;
    }
    try {
      estado("pidiendo permiso…");
      visor.classList.remove("oculto");
      const detalle = await abrir(visor);
      boton.textContent = "Detener la cámara";
      estado(detalle);
    } catch (error) {
      visor.classList.add("oculto");
      estado(error.name === "NotAllowedError" ? "permiso denegado" : error.message);
    }
  });

  caja.querySelector("#salir").addEventListener("click", () => salir());
}

export function unmount() {
  cerrar();
}
