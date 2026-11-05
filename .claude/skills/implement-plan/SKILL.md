---
name: implement-plan
description: Implementa un plan de plans/ (creado con plan-feature) tarea a tarea con TDD estricto, en una rama con el nombre del plan creada desde development, marcando cada tarea como hecha y haciendo un commit por tarea con /commit. Úsalo cuando pidan implementar, ejecutar o desarrollar un plan.
argument-hint: <ruta o nombre del plan, p. ej. plans/1-login-registro-usuarios.md>
allowed-tools: Read, Edit, Write, Glob, Grep, Skill, Bash(git:*), Bash(npm:*), Bash(npx:*), Bash(node:*), Bash(ls:*)
---

# Implementar un plan

Plan indicado por el usuario: $ARGUMENTS

Tu trabajo es **implementar el plan tarea a tarea**, con TDD estricto y un
commit por tarea. No implementes nada que no esté en el plan.

## 1. Localiza y lee el plan

- Si `$ARGUMENTS` es una ruta, úsala. Si es un nombre o un número de issue,
  búscalo en `plans/` (p. ej. `1` → `plans/1-*.md`).
- Si no se indica ningún plan, o hay varios candidatos, pregunta al usuario.
- Lee el plan completo, `CLAUDE.md` y la documentación de `docs/` que aplique.
- Si el plan tiene **dudas abiertas** sin resolver que afecten a las tareas,
  pregúntalas antes de empezar.
- Las tareas son las líneas `- [ ] **Tn** — ...` de la sección **Tareas**. Las
  que ya estén marcadas `- [x]` se consideran hechas: se continúa por la primera
  pendiente.

## 2. Prepara la rama

El nombre de la rama es el nombre del archivo del plan sin `.md`
(p. ej. `plans/1-login-registro-usuarios.md` → `1-login-registro-usuarios`).

1. Comprueba que estás en un repositorio git (`git rev-parse --is-inside-work-tree`).
   Si no lo es, **detente y pregunta** al usuario; no ejecutes `git init` por tu cuenta.
2. Comprueba que el árbol de trabajo está limpio (`git status --porcelain`). Si
   hay cambios ajenos al plan, detente y pregunta qué hacer con ellos (no los
   descartes ni los metas en un stash sin permiso).
3. Asegura que existe `development`:
   - `git rev-parse --verify development` → si existe, sigue.
   - Si no existe, créala a partir de `main`: `git branch development main`.
     Si tampoco existe `main`, detente y pregunta.
4. Crea la rama del plan desde `development` y cámbiate a ella:
   `git switch -c <nombre-del-plan> development`.
   - Si la rama ya existe, pregunta al usuario si quiere continuar en ella
     (`git switch <nombre-del-plan>`) retomando las tareas pendientes.
5. En el plan, cambia `**Estado:** Propuesto` por `**Estado:** En curso`.
   Este cambio se incluirá en el commit de la primera tarea.

## 3. Requisito previo: vitest

TDD necesita poder ejecutar tests. Si `vitest` no está instalado ni hay un
script `test` que lo use:

- Si el plan tiene una tarea que lo instala, hazla **la primera** (aunque no lo
  sea en el orden del plan) e indícalo al usuario.
- Si el plan no lo contempla, detente y pregunta.

## 4. Bucle por tarea (TDD estricto)

Para **cada tarea pendiente, en orden y de una en una**:

1. **Anuncia** la tarea (`Tn — descripción`).
2. **RED — escribe primero el test.**
   - Crea o amplía el test en `tests/` (vitest; `supertest` para endpoints)
     que describa el comportamiento que pide la tarea, y solo ese.
   - Ejecuta solo ese test (`npx vitest run <archivo>`) y **comprueba que falla
     por el motivo esperado** (la funcionalidad no existe o no es correcta), no
     por un error de sintaxis o de configuración del test. Si pasa a la
     primera, el test no prueba nada nuevo: reescríbelo.
   - No escribas código de producción en este paso.
3. **GREEN — implementa el mínimo código** que haga pasar el test, respetando
   las convenciones de `CLAUDE.md`: arquitectura por capas (`controllers/`,
   `services/`, `repositories/`, `models/`, `utils/`), funciones en
   `snake_case`, API en camelCase y SQL en snake_case, mensajes en español y el
   404 JSON registrado el último.
   - Ejecuta el test de la tarea hasta que pase y luego **toda la suite**
     (`npm test`) para comprobar que no has roto nada.
   - Nunca modifiques ni borres un test para que pase, salvo que el test esté
     mal; en ese caso explícalo.
4. **REFACTOR** si hace falta, manteniendo la suite en verde. Si eslint y
   prettier ya están configurados, pásalos a los archivos tocados.
5. **Marca la tarea como hecha** en el plan: cambia `- [ ] **Tn**` por
   `- [x] **Tn**`. Solo se marca cuando su test pasa.
6. **Haz el commit con el slash command `/commit`**: invoca la skill `commit`
   con la herramienta Skill, pasando como argumento el identificador y la
   descripción de la tarea (p. ej. `T6 — crear usuarios_repository con
   insertar_usuario y buscar_por_email`). El commit debe incluir el test, el
   código y el plan actualizado.
7. Comprueba con `git status --porcelain` que no ha quedado nada sin commitear
   y pasa a la siguiente tarea.

### Tareas sin comportamiento que testear

Algunas tareas no producen comportamiento testeable (instalar dependencias,
configurar eslint/prettier, ejecutar el linter…). En esas:

- Sustituye RED/GREEN por una **verificación objetiva** (p. ej. `npx vitest --version`,
  `npx eslint .`, `npx prettier --check .`) y deja constancia de ello al usuario.
- Si la tarea añade una regla o cambia comportamiento, por pequeño que sea, sí
  necesita test.
- El resto del bucle (marcar en el plan y `/commit`) es igual.

### Si algo falla

- Si no consigues que el test pase tras varios intentos razonables, o la tarea
  requiere algo fuera del alcance del plan, **detente**, no marques la tarea y
  explica al usuario el problema y las opciones.
- Si descubres que el plan es incorrecto o le falta una tarea, propón el cambio
  al usuario antes de modificar el plan.

## 5. Cierre

Cuando todas las tareas estén marcadas:

1. Ejecuta la suite completa (`npm test`) y, si están configurados, eslint y prettier.
2. Repasa los **Criterios de aceptación** del plan; marca con `- [x]` los que
   estén verificados y deja sin marcar (explicando por qué) los que no.
3. Cambia el estado del plan a `**Estado:** Implementado` y haz un último commit
   con `/commit`.
4. Resume al usuario: rama creada, tareas completadas, commits realizados
   (`git log --oneline development..HEAD`) y cualquier criterio de aceptación o
   duda pendiente. No hagas merge ni push salvo que el usuario lo pida.
