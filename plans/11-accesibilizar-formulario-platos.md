# #11 — Accesibilizar el formulario de platos

- **Tipo:** bugfix
- **Fecha:** 2026-11-05
- **Estado:** En curso

## Objetivo

El formulario de creación/edición de platos de `web-admin` no se puede usar con
teclado ni con lector de pantalla: los botones (Guardar, Cancelar, añadir y
quitar ingrediente) son `<div>` con `(click)`, las etiquetas son `<div
class="fake-label">` sin asociar a los campos, no hay `<form>` ni validación
visible y los elementos interactivos no tienen foco visible. Se quiere que
cumpla WCAG 2.2 AA: completar y enviar el formulario solo con teclado, con un
orden de tabulación lógico, foco visible y errores anunciados. Como evidencia,
se graba un vídeo con Playwright del recorrido completo usando solo el teclado.

## Alcance

**Incluye:**

- Semántica del formulario: `<form (ngSubmit)>`, `<h1>`/`<h2>` reales,
  `<label for>` en todos los campos (etiqueta visualmente oculta para la
  cantidad del ingrediente), `<button>`/`<a>` nativos en lugar de `<div>`.
- Nombres accesibles en los botones solo-icono (volver, añadir ingrediente,
  quitar «<ingrediente>»), iconos con `aria-hidden`.
- Validación en cliente (nombre obligatorio, precio > 0, cantidad > 0 al
  añadir ingrediente) con mensajes por campo (`aria-invalid`,
  `aria-describedby`), resumen de errores con `role="alert"` y foco al primer
  campo inválido al enviar.
- Gestión del foco y anuncios: al quitar un ingrediente el foco va al
  siguiente chip o al selector de ingrediente; altas/bajas de ingredientes se
  anuncian en una región `aria-live="polite"`; Enter en la cantidad añade el
  ingrediente en vez de enviar el formulario.
- Foco visible (`:focus-visible`) en `.btn`, `.back-link` y botones de quitar
  ingrediente, con contraste ≥ 3:1 (WCAG 2.4.7, 2.4.11, 1.4.11).
- Error de la API mostrado con `role="alert"`; botón Guardar con
  `[disabled]`/`aria-busy` mientras se guarda.
- Configuración de Playwright en `web-admin` y un test e2e que graba el vídeo
  del recorrido por teclado.

**No incluye:**

- Accesibilidad del resto de páginas (lista de platos, ingredientes, empleados,
  login…) ni de la shell/menú lateral.
- Revisión global de contraste de la paleta (`--text-muted`) en `base.css`.
- El bug #3 (página en blanco al entrar directamente en la URL de platos): el
  test navega por la UI para no depender de él.
- Cambios en la API (sus validaciones ya existen: `DishNameRequiredError`,
  `InvalidPriceError`).
- Integrar Playwright en CI.

## Archivos afectados

| Archivo | Acción | Motivo |
| ------- | ------ | ------ |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.html` | modificar | Semántica, labels, botones nativos, ARIA, mensajes de error, región live |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.ts` | modificar | Validación, signal de errores, gestión del foco (`viewChild`), Enter en cantidad, anuncios |
| `packages/web-admin/src/app/features/dishes/pages/dish-form/dish-form.component.css` | modificar | Eliminar `.fake-*`, estilos de error, `:focus-visible`, reset de `<button>` en chips |
| `packages/web-shared/src/lib/styles/base.css` | modificar | `:focus-visible` en `.btn` y utilidad `.visually-hidden` reutilizable |
| `packages/web-admin/package.json` | modificar | devDependency `@playwright/test` y script `e2e` |
| `packages/web-admin/playwright.config.ts` | crear | Config: Chromium, `video: 'on'`, `slowMo`, `webServer` (API + admin) con `reuseExistingServer` |
| `packages/web-admin/e2e/dish-form-keyboard.spec.ts` | crear | Test que recorre el formulario solo con teclado y guarda el vídeo |
| `packages/web-admin/e2e/videos/dish-form-keyboard.webm` | crear | Vídeo resultante (evidencia del criterio de aceptación) |
| `.gitignore` | modificar | Ignorar `test-results/` y `playwright-report/` |

## Tareas

> Cada tarea debe llevar entre 5 y 10 minutos.

- [x] **T1** — Instalar Playwright en web-admin: `npm i -D @playwright/test -w @resttek/web-admin`, `npx playwright install chromium`, script `"e2e": "playwright test"` y entradas en `.gitignore` (`packages/web-admin/package.json`, `.gitignore`) · ~5 min
- [x] **T2** — Crear `playwright.config.ts`: `testDir: 'e2e'`, `baseURL: http://localhost:4200`, Chromium, `viewport 1280x800`, `video: { mode: 'on', size: 1280x800 }`, `launchOptions.slowMo: 300`, `webServer` con `npm run dev:api` (url `http://localhost:3000/health`) y `npm run dev:admin` (url `http://localhost:4200`), `reuseExistingServer: true`, `cwd` en la raíz (`packages/web-admin/playwright.config.ts`) · ~10 min
- [x] **T3** — Test e2e en rojo, parte 1: login con `admin@resttek.com`, navegación por la UI hasta restaurante → Platos → «Nuevo plato», y comprobaciones de accesibilidad básicas: `getByLabel('Nombre del plato')`, `getByLabel('Precio (€)')`, `getByRole('button', { name: 'Guardar' })` y `getByRole('heading', { level: 1, name: 'Nuevo plato' })` (`packages/web-admin/e2e/dish-form-keyboard.spec.ts`) · ~10 min
- [x] **T4** — Test e2e en rojo, parte 2: recorrido solo con `page.keyboard` (Tab/Shift+Tab, flechas en selects, Enter/Espacio): rellenar y modificar datos, añadir dos ingredientes, quitar uno, enviar incompleto (nombre vacío y precio 0) y comprobar `role="alert"`, `aria-invalid="true"` y foco en el primer campo inválido; corregir, enviar y comprobar el plato en la tabla de la lista. Al final `page.video().saveAs('e2e/videos/dish-form-keyboard.webm')` (nombre del plato con sufijo `Date.now()` para que sea repetible) · ~10 min
- [x] **T5** — Utilidades globales: clase `.visually-hidden` y `.btn:focus-visible` (outline 2px `--border-focus` + offset) en `base.css` (`packages/web-shared/src/lib/styles/base.css`) · ~5 min
- [x] **T6** — Semántica del formulario: envolver en `<form (ngSubmit)="onSubmit()" novalidate>`, `<h1>` en lugar de `.fake-title`, `<h2>` en ingredientes, `<label for>` + `id` en nombre, precio, categoría, disponible y descripción; `required` en nombre y precio con indicador visual (`dish-form.component.html`) · ~10 min
- [x] **T7** — Botones nativos: Guardar `<button type="submit" [disabled]="loading()" [attr.aria-busy]="loading()">`, Cancelar `<a [routerLink]>`, volver con `aria-label="Volver a la lista de platos"`, iconos `aria-hidden="true"` (`dish-form.component.html`) · ~5 min
- [x] **T8** — Zona de ingredientes: `<label>` para el selector y label `.visually-hidden` para la cantidad; botón `<button type="button" aria-label="Añadir ingrediente">`; chips como `<ul>/<li>` con `<button type="button" [attr.aria-label]="'Quitar ' + nombre">` (`dish-form.component.html`) · ~10 min
- [x] **T9** — Lógica de ingredientes: Enter en la cantidad llama a `addIngredient()` con `preventDefault`; error inline si falta ingrediente o cantidad ≤ 0 o ya está añadido; mensaje en región `aria-live="polite"` («Tomate añadido», «Tomate quitado») (`dish-form.component.ts`, `.html`) · ~10 min
- [x] **T10** — Foco tras quitar un ingrediente: con `viewChildren`/`viewChild` mover el foco al botón «Quitar» siguiente (o anterior) y, si no quedan, al selector de ingrediente; tras añadir, devolver el foco al selector (`dish-form.component.ts`) · ~10 min
- [x] **T11** — Validación al enviar: `errors = signal<{ name?: string; price?: string }>({})`, función `validate()` (nombre obligatorio, precio > 0); si hay errores no llama al store, muestra resumen `role="alert"` con enlaces/listado y mueve el foco al primer campo inválido (`dish-form.component.ts`) · ~10 min
- [x] **T12** — Mensajes por campo: `<p id="name-error">` / `<p id="price-error">` enlazados con `aria-describedby` y `[attr.aria-invalid]`; limpiar el error del campo al corregirlo; `.alert-error` de la API con `role="alert"` (`dish-form.component.html`) · ~10 min
- [x] **T13** — Estilos: borrar `.fake-*`, estilo de `.field-error` y `.form-control[aria-invalid="true"]` (no solo color: icono o texto), `:focus-visible` en `.back-link` y `.chip-remove`, reset de botón en chips con área táctil ≥ 24×24 px (WCAG 2.5.8) (`dish-form.component.css`) · ~10 min
- [ ] **T14** — Verificar que el modo edición sigue funcionando (cargar plato, modificar, guardar) y que `npm run build -w @resttek/web-admin` compila sin errores · ~5 min
- [ ] **T15** — Ejecutar `npm run seed` y `npm run e2e -w @resttek/web-admin` hasta verde; revisar el vídeo generado (foco visible en cada paso, errores visibles, plato en la lista) y guardarlo en `e2e/videos/` · ~10 min
- [ ] **T16** — Pasada manual con teclado y comprobación rápida con lector de pantalla (NVDA/Narrador) del orden de tabulación y los anuncios; ejecutar `npm test` para confirmar que la API no se ha visto afectada · ~10 min

## Criterios de aceptación

- [ ] Dado el formulario «Nuevo plato», cuando se navega con Tab, entonces el orden es: volver → nombre → precio → categoría → disponible → descripción → selector de ingrediente → cantidad → añadir → (quitar de cada chip) → Cancelar → Guardar, y cada elemento enfocado muestra un indicador de foco visible.
- [ ] Todos los campos tienen nombre accesible: `getByLabel()` de Playwright localiza nombre, precio, categoría, disponible, descripción, ingrediente y cantidad; los botones solo-icono tienen `aria-label`.
- [ ] Dado un ingrediente añadido, cuando se activa «Quitar <ingrediente>» con Enter o Espacio, entonces desaparece, se anuncia en la región live y el foco no se pierde (va al siguiente botón de quitar o al selector).
- [ ] Dado el formulario con nombre vacío y precio 0, cuando se pulsa Enter o se activa Guardar, entonces no se llama a la API, aparece un resumen con `role="alert"`, los campos inválidos tienen `aria-invalid="true"` y mensaje asociado por `aria-describedby`, y el foco está en el campo «Nombre del plato».
- [ ] Dado el formulario completo y válido, cuando se envía con teclado, entonces se navega a la lista de platos y la fila del nuevo plato aparece en la tabla.
- [ ] `npm run e2e -w @resttek/web-admin` pasa y genera `packages/web-admin/e2e/videos/dish-form-keyboard.webm`, donde se ve: modificación de datos, alta y baja de ingredientes, envío incompleto con errores y creación correcta del plato visible en la lista, todo manejado solo con el teclado.
- [ ] `npm run build -w @resttek/web-admin` compila y `npm test` (Vitest de la API) sigue pasando.

## Dudas y decisiones

### Decisiones tomadas

- Número de issue **#11** — confirmado por el usuario.
- Se clasifica como **bugfix** aunque en `issues.json` figure como `feature` — así se pidió («corrección del bug»); no cambia el plan.
- Playwright se instala en el workspace `web-admin` (no en la raíz) — es el único frontend afectado y mantiene la dependencia acotada; la config levanta API y admin con `webServer` y reutiliza los servidores si ya están arrancados.
- El test llega al formulario haciendo clic en la UI tras el login y solo usa el teclado dentro del formulario — evita el bug #3 (página en blanco con URL directa) y el criterio pide teclado en el formulario, no en el login/menú.
- `slowMo` y nombre de plato con sufijo único — el vídeo debe ser seguible a simple vista y el test repetible sin limpiar la base de datos.
- Validación en cliente con signals y `ngModel` (sin pasar a Reactive Forms) — cambio mínimo y coherente con el resto de `web-admin`.
- No hay eslint/prettier ni Vitest en los frontends (según `CLAUDE.md`), así que la tarea de lint de la plantilla se sustituye por `ng build` y la de tests por el e2e de Playwright más `npm test` de la API.
- El vídeo se guarda en el proyecto, en `packages/web-admin/e2e/videos/` (confirmado por el usuario); `test-results/` y `playwright-report/` se ignoran.
- El test e2e queda en el proyecto como test permanente (`packages/web-admin/e2e/dish-form-keyboard.spec.ts`, confirmado por el usuario), ejecutable con `npm run e2e -w @resttek/web-admin`; integrarlo en CI sigue fuera de alcance.

### Dudas abiertas

- Ninguna.
