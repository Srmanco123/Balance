export const titulo = "Progreso";

export function mount(caja) {
  caja.innerHTML = `
    <div class="vacio">
      <strong>Progreso.</strong>
      Tendencia de peso, objetivo y siluetas. Llega en la tanda 2.
    </div>`;
}

export function unmount() {}
