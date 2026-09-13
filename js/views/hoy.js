export const titulo = "Hoy";

export function mount(caja) {
  caja.innerHTML = `
    <div class="vacio">
      <strong>Todavía no hay nada que contar.</strong>
      El presupuesto aparecerá aquí cuando estén el registro de comida y el motor.
    </div>`;
}

export function unmount() {}
