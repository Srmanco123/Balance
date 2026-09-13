export const titulo = "Entreno";

export function mount(caja) {
  caja.innerHTML = `
    <div class="vacio">
      <strong>Entrenos.</strong>
      Fuerza a mano y sesiones importadas del Watch. Llega en la tanda 2.
    </div>`;
}

export function unmount() {}
