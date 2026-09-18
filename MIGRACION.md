# Migración a Balance Pro — primera tanda

Consola del profesional sobre la app existente. Una sola app: el usuario cae en
su lado según el rol, y quien es las dos cosas cambia con el botón de la cabecera.

## 1. Archivos

**Nuevos**

| Archivo | Qué es |
|---|---|
| `js/data/sesion.js` | Resuelve consulta, rol y paciente activo |
| `js/views/consola.js` | Lista de pacientes y alta |
| `js/views/paciente.js` | Ficha: objetivo, menú, mensajes, logros |
| `js/views/dietas.js` | Plantillas de dieta de la consulta |
| `firestore.rules` | Reglas, en la raíz del repo |

**Reemplazan a los tuyos**

| Archivo | Cambio |
|---|---|
| `js/data/repo.js` | Rutas de consulta y colecciones nuevas |
| `js/app.js` | Enrutado por rol y conmutador de lado |

**Se añade al final**

`css/consola.css` va pegado al final de `css/estilo.css`. No crees un segundo
archivo: `index.html` no cambia en esta tanda.

## 2. Un reemplazo en las vistas

`repo.js` mantiene todas las firmas, pero el primer argumento ya no es el uid:
es el paciente al que se le leen los datos. En los seis archivos de vistas:

```
usuario().uid   →   sujeto()
```

Y añadir el import en cada uno de ellos:

```js
import { sujeto } from "../data/sesion.js";
```

Son 18 apariciones: `comida.js` (6), `entreno.js` (5), `perfil.js` (2),
`hoy.js`, `macros.js`, `progreso.js`, `ajustes.js`. En `ajustes.js` el uso es
`usuario()` completo para mostrar el correo, así que ese **no** se toca.

El import de `usuario` se puede quitar allí donde deje de usarse; si se queda,
no molesta.

## 3. Un cambio en `hoy.js`

Hoy solo se respeta el objetivo guardado cuando el origen es `medido`. Hay que
añadir `pautado`, y que mande sobre el resto:

```js
const pautado = perfil.objetivoOrigen === "pautado" && perfil.objetivoKcal;
const medido  = perfil.objetivoOrigen === "medido"  && perfil.objetivoKcal;
const objetivo = (pautado || medido) ? perfil.objetivoKcal : objetivoInicial(perfil);
```

Y en la nota de debajo, distinguir el texto: si está pautado, decir que lo ha
fijado el nutricionista y no que sale del gasto medido.

## 4. Crear la consulta a mano

En la consola de Firestore, dos documentos. No hay alta automática a propósito:
si el cliente pudiera escribir el índice, cualquiera con una cuenta de Google se
montaría su propia consulta dentro de tu proyecto y te gastaría la cuota de IA.

**`consultas/{idQueElijas}`**

```
nombre: "Balance"
titular: "<tu uid>"
plan: "titular"
```

**`consultas/{idQueElijas}/pacientes/{idQueElijas}`** — tu propia ficha

```
nombre: "Manuel"
uid: "<tu uid>"
estado: "activo"
puntos: 0
racha: 0
```

**`indice/{tu uid}`**

```
consulta: "<idDeLaConsulta>"
rol: "titular"
paciente: "<idDeTuFicha>"
```

Con `rol: titular` y `paciente` rellenos verás las dos caras y el conmutador.

## 5. Mover tus datos actuales

Están en `usuarios/{tu uid}/…` y hay que llevarlos a
`consultas/{c}/pacientes/{p}/…`. Colecciones a mover: `config`, `pesos`,
`entradas`, `entrenos`, `recetas`, `plantillas`. Los `productos` van a la raíz
`productos/{ean}`.

Desde el navegador no se puede hacer en bloque: hace falta un script con el SDK
de administración y una clave de servicio, o rehacerlo a mano si son pocos
registros. Dímelo y te escribo el script.

Si prefieres arrancar limpio, no hay nada que hacer: la app creará todo en las
rutas nuevas.

## 6. Desplegar las reglas

```bash
firebase deploy --only firestore:rules
```

Y no volver a editarlas en la consola web, porque el siguiente despliegue las
sobrescribe sin avisar.

**Coste**: en esta tanda las reglas hacen un `get()` a `indice/{uid}` por
evaluación, y eso es una lectura facturable cada vez. Es aceptable mientras
seas tú y unos pocos pacientes; con volumen real hay que pasar a claims en el
token, que es trabajo del Worker.

## 7. Tres pruebas antes de dar por buena la tanda

Con el emulador o con dos cuentas de Google distintas:

1. Un paciente intentando leer `consultas/{otra}/pacientes/{cualquiera}`: debe fallar.
2. Un paciente escribiendo `objetivoKcal` en su propio `config/perfil`: debe fallar.
3. Un paciente escribiendo en `menu/actual`: debe fallar.

Si las tres fallan, el aislamiento aguanta. Es la única invariante que si se
rompe hunde el producto.

## Lo que queda fuera de esta tanda

- **Invitación real por correo.** La consola genera el enlace, pero no vincula
  nada: el enlace hay que firmarlo y el índice lo tiene que escribir el
  servidor. Necesita el Worker.
- **Claims en el token.** Mientras no estén, las reglas pagan un `get()`.
- **Logros automáticos.** Ahora los concede el profesional a mano. Una medalla
  que el paciente puede activarse él mismo no motiva a nadie, así que esto
  tiene que acabar en el servidor.
- **Adherencia calculada.** El campo `adherencia` de la ficha se pinta pero
  nadie lo escribe todavía.
- **Pantalla «Mi dieta» del paciente.** El menú ya se guarda; falta la vista que
  lo muestra en el móvil. Es la siguiente tanda y es corta.
- **El arreglo del service worker**, que cachea las respuestas autenticadas del
  Worker con datos de salud dentro. Eso es independiente de esto y conviene
  hacerlo ya.
