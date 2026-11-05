# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Qué es

Resttek: plataforma de gestión de restaurantes. Monorepo con npm workspaces (`packages/*`): una API Express 5 + TypeScript + SQLite (`api`), tres apps Angular 21 (`web-admin`, `web-empleados`, `web-clientes`) y una librería compartida (`web-shared`, `@resttek/web-shared`). Documentación detallada en `docs/` (arquitectura y dominio); léela antes de cambios grandes. Los docs y la UI están en español.

## Comandos (desde la raíz)

```bash
npm install                 # una sola vez; enlaza los workspaces
npm run seed                # puebla packages/api/resttek.db (idempotente, INSERT OR IGNORE)
npm run dev:api             # API en :3000 (tsx watch)
npm run dev:admin           # :4200
npm run dev:empleados       # :4201
npm run dev:clientes        # :4202
npm test                    # solo tests de la API (Vitest)
```

- Un test concreto: `cd packages/api && npx vitest run src/services/order.service.test.ts` (o `-t "nombre del test"`).
- No hay lint configurado ni tests en los frontends; el `build` de Angular es `npm run build -w @resttek/web-<app>`.
- Los frontends hacen proxy de `/api` a `localhost:3000` (`proxy.conf.json`); accede por el puerto del frontend, no directo a la API.
- Cambios en `web-shared` no se recargan solos: reinicia el dev server del frontend.
- Credenciales de prueba tras el seed: la contraseña es el propio email (`admin@resttek.com`, `gerente1@resttek.com`, `cocinero1@resttek.com`, `camarero1@resttek.com`, `cliente1@resttek.com`...).

## Arquitectura de la API (`packages/api/src`)

Conviven **dos estilos**; identifica cuál aplica antes de tocar código:

- **Hexagonal + DDD solo en `contexts/employee/`** (domain → application → infrastructure). `Employee` es la única entidad real (constructor privado + `Employee.create()`); casos de uso con `execute()` (`LoginUseCase`, `CreateEmployeeUseCase`, `RegisterClientUseCase`); interfaces con prefijo `I`. `contexts/shared/` guarda `Email`, middlewares y `errorHandler`.
- **Por capas en `restaurant`, `dish`, `ingredient`, `order`**: `models/` (interfaces planas + `normalizeX()`), `repositories/` (interfaz sin prefijo + implementación SQLite en el mismo fichero), `services/`, `controllers/`, `routes/`. La composición de dependencias (repo → service → controller) se hace en el propio fichero de rutas; en `employee` está en `infrastructure/http/dependencies.ts`.

Puntos no obvios:
- Los **clientes son `Employee`** con `role='cliente'` y `restaurant_id=null`; no existe tabla de clientes.
- Al crear un pedido, cada unidad se guarda como un `order_items` con `quantity: 1` (cocina cambia estado por unidad). Estados: pendiente → preparando → listo → entregado.
- Rutas bajo `/api/v1` (excepto `/health`); los routers anidados bajo `/restaurants/:restaurantId/...` necesitan `Router({ mergeParams: true })`. Las rutas de pedidos no usan `authorize()`, solo `authenticate`.
- Errores: `AppError` → `DomainErrors.ts`; el `errorHandler` mapea código HTTP **por nombre de clase** (404/401/400/500). Un error de dominio nuevo que deba ser 404 hay que añadirlo a esa lista. `OrderController` no usa `next(error)`: gestiona sus errores a mano (`OrderNotFoundError` da 404 en GET pero 400 en el PATCH).
- Paquete ESM: los imports llevan extensión `.js` y usan alias de `tsconfig` (`@services/*`, `@employee/*`, `@shared/*`, etc.).
- `Database` (`config/database.ts`): migraciones `CREATE TABLE IF NOT EXISTS` al arrancar; con `NODE_ENV=test` usa `:memory:`. Las columnas snake_case se aliasan a camelCase en el SQL.
- Tests unitarios junto al código con dobles en `*/mocks/`; no hay tests HTTP (`supertest` está instalado pero sin uso).

## Arquitectura de los frontends

- Angular 21 standalone, signals, **zoneless**, guards/interceptors funcionales; RxJS solo para HTTP.
- `web-admin` y `web-empleados`: `features/<feature>/{models,pages,services,store}`; los stores (`providedIn: 'root'`, signals privadas + `asReadonly()`) envuelven los services con `firstValueFrom` y los componentes hablan solo con el store. `OrderStore` en empleados hace polling cada 30 s (no hay websockets).
- `web-clientes` es distinta: modelos/servicios en `core/`, componentes sueltos en `features/` que usan `.subscribe()` directamente; el único store es `CartStore` (local, se vacía al cambiar de restaurante). `my-orders` hace polling a 10 s.
- `web-shared` aporta auth (`AuthService`, `AuthStore`, `auth.guard`), `auth.interceptor` (añade el Bearer JWT), `error.interceptor` (401 → limpia sesión y va a `/login`), login/registro y estilos base. El guard solo comprueba sesión, no roles; el filtrado por rol en `web-empleados` es solo de navegación, la seguridad real es `authorize()` en la API.

## Scripts

`scripts/seed-issues.sh` crea issues de GitHub desde `scripts/issues.json` con `gh` y `jq` (`--dry-run` para simular); ver `scripts/README.md`.
