---
name: plan-feature
description: Planifica una nueva funcionalidad o el arreglo de un error antes de implementarlo, usando la plantilla común del proyecto, y guarda el plan en plans/<num_issue>-<breve-descripcion>.md. Úsalo cuando pidan planificar, diseñar o preparar un plan para una feature, mejora o bug.
argument-hint: <num_issue> <descripción de la funcionalidad o del error>
allowed-tools: Read, Glob, Grep, Write, Bash(ls:*)
---

# Planificar una funcionalidad o un arreglo

Petición del usuario: $ARGUMENTS

Tu trabajo es **planificar, no implementar**. No modifiques código fuente; el
único archivo que creas es el plan.

## Pasos

1. **Datos de entrada.**
   - Extrae de la petición el número de issue y la descripción.
   - Si falta el número de issue o la petición es tan ambigua que no se puede
     planificar, pregúntalo al usuario antes de seguir.
   - Clasifica la petición como `feature` o `bugfix`.

2. **Analiza el código.**
   - Lee `CLAUDE.md` y la documentación de `docs/` que aplique (p. ej.
     `docs/api/api-pagination.md` si el cambio toca paginación en endpoints GET).
   - Localiza el código implicado en cada capa: `controllers/`, `services/`,
     `repositories/`, `models/`, `utils/`, `index.js` y `db.js`.
   - En un bug, identifica la causa probable y dónde se reproduce.

3. **Redacta el plan** siguiendo **exactamente** la plantilla
   [assets\template.md](assets/template.md), sin quitar ni reordenar secciones:
   - **Objetivo**: qué se quiere conseguir y por qué, en 1-3 frases.
   - **Alcance**: qué entra y, explícitamente, qué queda fuera.
   - **Archivos afectados**: ruta, acción (crear / modificar / eliminar) y motivo.
   - **Tareas**: cada tarea debe poder hacerse en **5-10 minutos**. Si una tarea
     es más grande, divídela. Ordénalas para que el proyecto funcione tras cada
     una e incluye tareas de tests (vitest) y de lint/formato (eslint, prettier).
   - **Criterios de aceptación**: comprobables y verificables (petición →
     respuesta esperada, código de estado, test que pasa…).
   - **Dudas y decisiones**: toda suposición o decisión tomada por tu cuenta y
     toda pregunta abierta. Si no hay ninguna, escribe "Ninguna".

4. **Respeta las convenciones del proyecto** al proponer cambios: funciones en
   `snake_case`, arquitectura por capas, API en camelCase y SQL en snake_case,
   mensajes en español, el 404 JSON registrado el último en `index.js` y
   cambios en `CATEGORIAS` tratados como migración de la base de datos.

5. **Guarda el plan** en `plans/<num_issue>-<breve-descripcion>.md`:
   - `<breve-descripcion>` en kebab-case, minúsculas, sin tildes ni `ñ`, de
     2 a 5 palabras (p. ej. `plans/42-paginacion-get-vendehumos.md`).
   - Crea la carpeta `plans/` si no existe.
   - Si ya existe un archivo con ese nombre, pregunta antes de sobrescribirlo.

6. **Resume al usuario** la ruta del plan, el número de tareas y las dudas
   abiertas que necesiten su respuesta.
