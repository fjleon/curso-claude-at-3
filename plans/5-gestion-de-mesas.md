# #5 — Gestión de mesas

- **Tipo:** feature
- **Fecha:** 2026-11-12
- **Estado:** Implementado

## Objetivo

Introducir la entidad **Mesa** (id, número, descripción, capacidad y estado
`libre` / `ocupada` / `reservada`) por restaurante. El administrador la
gestiona (CRUD) desde `web-admin`; el cliente, al entrar en un restaurante,
indica el número de personas, elige una mesa libre con capacidad suficiente y
al continuar la mesa pasa a `ocupada` y sus pedidos quedan asociados a ella; los
empleados ven y cambian el estado de las mesas y consultan los pedidos activos
de las mesas ocupadas.

## Alcance

**Incluye:**

- API (estilo por capas, como `ingredient`): modelo `Table` +
  `normalizeTableStatus()`, tabla SQLite `restaurant_tables`, repositorio,
  servicio, controlador y rutas.
  - `GET/POST /api/v1/restaurants/:restaurantId/tables` y
    `GET/PUT/DELETE /api/v1/restaurants/:restaurantId/tables/:id`
    (escritura solo `admin`; lectura `admin`, `manager`, `camarero`, `cocinero`).
  - `PATCH /api/v1/restaurants/:restaurantId/tables/:id/status`
    (`admin`, `manager`, `camarero`, `cocinero`).
  - `GET /api/v1/public/restaurants/:restaurantId/tables?people=N` (mesas
    `libre` con `capacity >= N`, ordenadas por capacidad ascendente) y
    `POST /api/v1/public/restaurants/:restaurantId/tables/:id/occupy`, ambas con
    `authenticate` (cliente logueado).
  - Ocupación atómica (`UPDATE ... WHERE status = 'libre'`) para que dos
    clientes no ocupen la misma mesa.
  - Errores de dominio nuevos y mapeo en `errorHandler` (404 y nuevo 409).
  - Tests unitarios (servicio con mock) e integración (repositorio en `:memory:`).
  - Seed: mesas de ejemplo para `rest-1` y `rest-2`; el pedido de ejemplo apunta
    a una mesa real ocupada.
- `web-admin`: feature `tables` (models, services, store, páginas lista y
  formulario) bajo `restaurants/:restaurantId/tables` y tarjeta en el dashboard
  del restaurante.
- `web-empleados`: feature `tables` con página `/mesas` (rejilla de mesas,
  cambio de estado y pedidos activos de cada mesa ocupada, con polling de
  30 s), entrada en el menú lateral.
- `web-clientes`: paso de selección de mesa (`/restaurants/:id/table`) entre la
  lista de restaurantes y la carta; `CartStore` guarda la mesa elegida y el
  pedido se envía con `tableId`.
- Documentación: `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md`,
  `docs/arquitectura/arquitectura-api.md` y `arquitectura-frontend.md`.

**No incluye:**

- Reservas con fecha/hora: `reservada` es solo un estado que pone el personal.
- Liberación automática de la mesa (al pagar o al entregarse todo); se libera a
  mano desde `web-empleados`.
- Refactorizar el controlador de pedidos (la validación de `tableId` se añade en
  `OrderService`, ver T15b; el controlador sigue respondiendo 400).
- Plano visual del salón, unión de mesas, websockets.
- Tests en los frontends (no hay infraestructura) y configuración de
  eslint/prettier (no existe en el proyecto).

## Archivos afectados

| Archivo | Acción | Motivo |
| ------- | ------ | ------ |
| `packages/api/src/models/table.model.ts` | crear | Interfaz `Table`, `TableStatusType`, `normalizeTableStatus()` |
| `packages/api/src/models/table.model.test.ts` | crear | Tests de `normalizeTableStatus()` |
| `packages/api/src/errors/DomainErrors.ts` | modificar | `TableNotFoundError`, `InvalidTableNumberError`, `InvalidCapacityError`, `InvalidTableStatusError`, `InvalidPeopleError`, `DuplicatedTableNumberError`, `TableNotAvailableError`, `TableOccupiedError` |
| `packages/api/src/contexts/shared/infrastructure/http/errorHandler.ts` | modificar | `TableNotFoundError` → 404; nueva lista `CONFLICT_ERRORS` → 409 |
| `packages/api/src/config/database.ts` | modificar | Migración `restaurant_tables` con `UNIQUE(restaurant_id, number)` |
| `packages/api/src/repositories/table.repository.ts` | crear | Interfaz `TableRepository` + `SqliteTableRepository` |
| `packages/api/src/repositories/table.repository.test.ts` | crear | Integración con SQLite en memoria |
| `packages/api/src/repositories/mocks/MockTableRepository.ts` | crear | Doble para tests del servicio |
| `packages/api/src/services/table.service.ts` | crear | Lógica de negocio y validaciones |
| `packages/api/src/services/table.service.test.ts` | crear | Tests unitarios del servicio |
| `packages/api/src/controllers/table.controller.ts` | crear | Handlers HTTP con `next(error)` |
| `packages/api/src/routes/table.routes.ts` | crear | Rutas privadas (`mergeParams`) y composición repo → service → controller |
| `packages/api/src/routes/table.public.routes.ts` | crear | Rutas de cliente (disponibles y ocupar) |
| `packages/api/src/app.ts` | modificar | Registrar ambos routers |
| `packages/api/src/scripts/seed.ts` | modificar | Mesas de ejemplo y `table_id` real en el pedido |
| `packages/web-admin/src/app/features/tables/**` | crear | `models/table.model.ts`, `services/table.service.ts`, `store/table.store.ts`, `pages/table-list`, `pages/table-form`, `tables.routes.ts` |
| `packages/web-admin/src/app/app.routes.ts` | modificar | Ruta hija `tables` |
| `packages/web-admin/src/app/features/restaurants/pages/restaurant-dashboard/restaurant-dashboard.component.html` | modificar | Tarjeta «Mesas» |
| `packages/web-empleados/src/app/features/tables/**` | crear | `models`, `services`, `store`, `pages/mesas` |
| `packages/web-empleados/src/app/app.routes.ts` | modificar | Ruta `/mesas` |
| `packages/web-empleados/src/app/core/layout/shell.component.{ts,html}` | modificar | Entrada «Mesas» en el menú (`canSeeMesas`) |
| `packages/web-clientes/src/app/core/models/table.model.ts` | crear | Modelo de mesa |
| `packages/web-clientes/src/app/core/services/table.service.ts` | crear | Mesas disponibles y ocupar |
| `packages/web-clientes/src/app/core/store/cart.store.ts` | modificar | Estado de la mesa elegida |
| `packages/web-clientes/src/app/core/services/order.service.ts` | modificar | Enviar `tableId` |
| `packages/web-clientes/src/app/features/tables/select-table.component.ts` | crear | Paso «nº de personas → mesa → continuar» |
| `packages/web-clientes/src/app/app.routes.ts` | modificar | Ruta `restaurants/:id/table` |
| `packages/web-clientes/src/app/features/restaurants/restaurant-list.component.ts` | modificar | Enlazar a la selección de mesa |
| `packages/web-clientes/src/app/features/menu/restaurant-menu.component.ts` | modificar | Redirigir a selección de mesa si no hay mesa |
| `packages/web-clientes/src/app/features/cart/cart.component.ts` | modificar | Mostrar la mesa y no perderla al vaciar el carrito |
| `docs/dominio/modelo-datos.md`, `docs/dominio/glosario.md`, `docs/arquitectura/arquitectura-api.md`, `docs/arquitectura/arquitectura-frontend.md` | modificar | Documentar la entidad, endpoints y flujo |

## Tareas

> Cada tarea debe llevar entre 5 y 10 minutos.

**Contrato**

- [x] **T0** — Contrato de la API consensuado por los 4 agentes (api, web-admin, web-empleados, web-clientes) en `docs/api/openapi.yml` (endpoints de mesas, `POST /orders` con `tableId`, errores 400/401/403/404/409), validado con `redocly lint`; no se implementa nada hasta que los 4 den el OK · ~10 min

**API — dominio y persistencia**

- [x] **T1** — Test + implementación de `table.model.ts`: interfaz `Table` (`id`, `restaurantId`, `number`, `description: string | null`, `capacity`, `status`, `createdAt`, `updatedAt`) y `normalizeTableStatus()` (acepta `libre`/`ocupada`/`reservada`, normaliza mayúsculas y espacios, lanza `InvalidTableStatusError`) (`models/table.model.ts`, `models/table.model.test.ts`) · ~8 min
- [x] **T2** — Añadir los errores de mesa a `DomainErrors.ts` (mensajes en español) y en `errorHandler.ts` mapear `TableNotFoundError` a 404 y crear `CONFLICT_ERRORS` (`DuplicatedTableNumberError`, `TableNotAvailableError`, `TableOccupiedError`) → 409 · ~7 min
- [x] **T3** — Migración `CREATE TABLE IF NOT EXISTS restaurant_tables (id, restaurant_id, number INTEGER, description, capacity INTEGER, status TEXT DEFAULT 'libre', created_at, updated_at, UNIQUE(restaurant_id, number), FK restaurants)` en `database.ts` · ~5 min
- [x] **T4** — Test de integración (rojo) de `SqliteTableRepository`: guardar/buscar por id, listar por restaurante ordenado por número, actualizar, borrar (`repositories/table.repository.test.ts`) · ~8 min
- [x] **T5** — Implementar interfaz `TableRepository` y `SqliteTableRepository` (`findById`, `findByRestaurantId`, `findByNumber`, `save`, `delete`) con alias camelCase en el SQL hasta poner T4 en verde (`repositories/table.repository.ts`) · ~10 min
- [x] **T6** — Tests + implementación de `findAvailable(restaurantId, minCapacity)` y `occupyIfFree(id)` (UPDATE condicionado a `status = 'libre'` que devuelve `true/false` según `changes`) (`table.repository.ts`, `table.repository.test.ts`) · ~10 min
- [x] **T7** — `MockTableRepository` en memoria con la misma interfaz (`repositories/mocks/MockTableRepository.ts`) · ~5 min

**API — servicio**

- [x] **T8** — Tests + `TableService.create()`: número entero > 0, capacidad entera > 0, descripción opcional, estado inicial `libre`, número no repetido en el restaurante (`DuplicatedTableNumberError`) (`services/table.service.ts`, `.test.ts`) · ~10 min
- [x] **T9** — Tests + `update()` (404 si no existe, misma validación, número único excluyendo la propia mesa) y `findById` / `findByRestaurantId` · ~8 min
- [x] **T10** — Tests + `delete()` (404 si no existe; `TableOccupiedError` si está `ocupada`) y `changeStatus()` (valida con `normalizeTableStatus`) · ~8 min
- [x] **T11** — Tests + `findAvailable(restaurantId, people)` (`InvalidPeopleError` si no es entero > 0) y `occupy(restaurantId, id)` (404 si no existe o es de otro restaurante; `TableNotAvailableError` si `occupyIfFree` devuelve `false`) · ~10 min

**API — HTTP y datos**

- [x] **T12** — `TableController` (`create`, `getAll`, `getById`, `update`, `delete`, `changeStatus`, `getAvailable`, `occupy`, `toJSON`) usando `next(error)` (`controllers/table.controller.ts`) · ~10 min
- [x] **T13** — `table.routes.ts` (`Router({ mergeParams: true })`, `authenticate` + `authorize` por rol) y `table.public.routes.ts` (`authenticate`); registrarlos en `app.ts` bajo `/api/v1/restaurants/:restaurantId/tables` y `/api/v1/public/restaurants/:restaurantId/tables` · ~8 min
- [x] **T14** — Seed: 6 mesas en `rest-1` (capacidades 2, 2, 4, 4, 6, 8; la nº 5 `ocupada`) y 3 en `rest-2` con ids fijos (`INSERT OR IGNORE`); el pedido de ejemplo usa el id de la mesa nº 5 en vez de `'5'` (`scripts/seed.ts`) · ~7 min
- [x] **T15** — Ejecutar `npm test` y probar a mano con curl/REST client los endpoints (CRUD como admin, 403 como cocinero en POST, disponibles y ocupar como cliente, doble ocupación → 409) · ~8 min

- [x] **T15b** — Tests + validación en `OrderService.create()` (inyectando `TableRepository`): si llega `tableId`, la mesa debe existir, pertenecer a `restaurantId` y estar `ocupada`; si no, error de dominio (el controlador actual responde 400). Composición en `order.routes.ts` (`services/order.service.ts`, `.test.ts`) · ~10 min

**web-admin**

- [x] **T16** — `features/tables/models/table.model.ts`, `services/table.service.ts` (HttpClient a `/api/v1/restaurants/:id/tables`) y `store/table.store.ts` (signals privadas + `asReadonly()`, `firstValueFrom`) siguiendo `ingredients` · ~10 min
- [x] **T17** — Página `table-list` (tabla con número, descripción, capacidad, estado como badge, editar y borrar con confirmación y error de la API visible) · ~10 min
- [x] **T18** — Página `table-form` (alta/edición; número, descripción, capacidad, estado; validación en cliente) · ~10 min
- [x] **T19** — `tables.routes.ts`, ruta hija `tables` en `app.routes.ts` y tarjeta «Mesas» en el dashboard del restaurante; `npm run build -w @resttek/web-admin` · ~7 min

**web-empleados**

- [x] **T20** — `features/tables/models`, `services/table.service.ts` (listar y `PATCH status`) y `store/table.store.ts` con polling de 30 s (`startPolling`/`stopPolling`, como `OrderStore`) · ~10 min
- [x] **T21** — Página `mesas`: rejilla de mesas coloreada por estado y selector para cambiar el estado · ~10 min
- [x] **T22** — En `mesas`, para cada mesa ocupada, listar los pedidos activos de `OrderStore` cuyo `tableId` coincide (platos y estado de cada unidad) · ~8 min
- [x] **T23** — Ruta `/mesas`, `canSeeMesas` (admin, manager, camarero) y enlace en el menú lateral; `npm run build -w @resttek/web-empleados` · ~6 min

**web-clientes**

- [x] **T24** — `core/models/table.model.ts` y `core/services/table.service.ts` (`getAvailable(restaurantId, people)`, `occupy(restaurantId, tableId)`) · ~6 min
- [x] **T25** — `CartStore`: signals `tableId`/`tableNumber`, `setTable(restaurantId, table)` (si cambia de restaurante vacía el carrito), `clear()` conserva la mesa y nuevo `reset()`; `OrderService.createOrder` envía `tableId` · ~8 min
- [x] **T26** — `SelectTableComponent`: input de nº de personas, botón «Buscar mesas», lista de mesas disponibles seleccionables y «Continuar» (ocupa, guarda en `CartStore` y navega a la carta; si 409 avisa y recarga la lista) · ~10 min
- [x] **T27** — Ruta `restaurants/:id/table`, enlace desde `restaurant-list` a ese paso y redirección desde `restaurant-menu` si no hay mesa del restaurante en `CartStore` · ~7 min
- [x] **T28** — Mostrar «Mesa N» en el carrito y la carta; `npm run build -w @resttek/web-clientes` · ~6 min

**Cierre**

- [x] **T29** — Actualizar `docs/dominio/modelo-datos.md` (tabla `restaurant_tables`, relación con `orders.table_id`), `glosario.md` (Mesa y estados) y `docs/arquitectura/arquitectura-api.md` / `arquitectura-frontend.md` (endpoints, features nuevas, flujo del cliente) · ~10 min
- [x] **T30** — Comprobación final: `npm test`, `npx tsc --noEmit -p packages/api` y build de las tres apps; corregir avisos (no hay eslint/prettier configurados) · ~8 min

## Criterios de aceptación

- [x] Dado un admin, cuando hace `POST /api/v1/restaurants/rest-1/tables` con `{ number: 10, capacity: 4 }`, entonces recibe 201 con la mesa en estado `libre`; repetir el mismo número da 409 y una capacidad ≤ 0 da 400.
- [x] Dado un cocinero, cuando hace `POST`, `PUT` o `DELETE` sobre mesas, entonces recibe 403; `GET` y `PATCH .../status` le devuelven 200.
- [x] `GET .../tables/<id inexistente>` devuelve 404; `DELETE` de una mesa `ocupada` devuelve 409.
- [x] `PATCH .../tables/:id/status` con `{ status: "reservada" }` devuelve 200 y con `{ status: "rota" }` devuelve 400.
- [x] Dado un cliente logueado, `GET /api/v1/public/restaurants/rest-1/tables?people=3` devuelve solo mesas `libre` con `capacity >= 3`, ordenadas por capacidad; sin token devuelve 401 y con `people=0` devuelve 400.
- [x] `POST .../tables/:id/occupy` sobre una mesa libre devuelve 200 y la deja `ocupada`; una segunda llamada devuelve 409.
- [ ] En `web-clientes`, al pulsar un restaurante se pide el nº de personas, se listan solo las mesas válidas, al continuar se va a la carta y el pedido creado tiene `tableId` de esa mesa. — *pendiente de prueba manual en navegador: verificado solo con el build de Angular y revisión del código contra el contrato.*
- [ ] En `web-admin` se pueden crear, listar, editar y borrar mesas desde el dashboard del restaurante. — *pendiente de prueba manual en navegador: verificado solo con el build de Angular y revisión del código contra el contrato.*
- [ ] En `web-empleados`, `/mesas` muestra todas las mesas con su estado, permite cambiarlo y en las ocupadas muestra sus pedidos activos (se refresca cada 30 s). — *pendiente de prueba manual en navegador: verificado solo con el build de Angular y revisión del código contra el contrato.*
- [x] Tras `npm run seed`, `rest-1` tiene 6 mesas y el pedido de ejemplo aparece en la mesa nº 5.
- [x] Los tests de vitest relacionados pasan (`npm test`).
- [x] eslint no muestra errores y el código está formateado con prettier — **no aplica**: no hay eslint/prettier en el proyecto; se sustituye por `tsc --noEmit` y los builds de Angular sin errores.

## Dudas y decisiones

### Decisiones tomadas

- Tabla SQL `restaurant_tables` (no `tables`) — evita confusión con la palabra clave `TABLE` y con las tablas del esquema.
- Estilo por capas (como `ingredient`), no hexagonal — es el estilo de todas las entidades salvo `employee`.
- `UNIQUE(restaurant_id, number)` + comprobación en el servicio — el número de mesa identifica la mesa para personal y clientes.
- Nuevo código HTTP 409 (`CONFLICT_ERRORS`) para número duplicado, mesa no disponible y borrar mesa ocupada — 400 no distingue un conflicto de estado de un dato inválido.
- Ocupación con `UPDATE ... WHERE status = 'libre'` — evita condiciones de carrera entre dos clientes sin transacciones explícitas.
- Endpoints de cliente bajo `/public/restaurants/:restaurantId/tables` pero con `authenticate` — los clientes no pasan `authorize()` del resto de rutas privadas y ya están logueados en `web-clientes`.
- El cliente solo ve mesas con `capacity >= personas`, ordenadas por capacidad ascendente — así la primera opción es la que menos plazas desperdicia.
- Permisos: escritura de mesas solo `admin`; ver y cambiar estado `admin`, `manager`, `camarero`, `cocinero` (la issue dice «los empleados»). En el menú de `web-empleados` solo se muestra a admin, manager y camarero.
- La mesa se libera a mano desde `web-empleados`; `CartStore.clear()` tras enviar un pedido conserva la mesa para poder pedir más.
- El pedido sigue guardando `table_id` como texto (ahora el id de la mesa) sin FK — añadir FK obligaría a recrear `orders` y no se puede con `CREATE TABLE IF NOT EXISTS`.
- La nueva tabla no necesita borrar `resttek.db` (es `CREATE TABLE IF NOT EXISTS` de una tabla nueva); sí hay que volver a ejecutar `npm run seed`.

### Dudas resueltas (respuesta en la issue, 2026-11-12)

- ¿Pueden los cocineros cambiar el estado de las mesas? — **Sí**, todos los empleados.
- ¿Puede el cliente elegir una mesa `reservada`? — **No**, solo `libre`.
- ¿Qué pasa si el cliente abandona tras ocupar la mesa? — Queda `ocupada` hasta que la libere el personal.
- ¿Validar en `POST /orders` el `tableId`? — **Sí** → se añade la tarea T15b. `tableId` sigue siendo opcional; si llega, se valida.
- Se añade la tarea T0: contrato OpenAPI (`docs/api/openapi.yml`) acordado entre los agentes de API y frontends antes de implementar.

