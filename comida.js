export const titulo = "Comida";

export function mount(caja) {
  caja.innerHTML = `
    <div class="vacio">
      <strong>Registro de comida.</strong>
      Foto del plato, código de barras y recetas. Llega en la tanda 1.
    </div>`;
}

export function unmount() {}
