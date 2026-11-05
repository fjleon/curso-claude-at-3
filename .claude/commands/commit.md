---
description: Crea un commit siguiendo la especificación Conventional Commits
argument-hint: [descripción opcional del cambio]
allowed-tools: Bash(git status:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Bash(git log:*)
disallowed-tools: Bash(git init:*)
---

# Commit con Conventional Commits

Crea un commit de los cambios actuales siguiendo la especificación
[Conventional Commits 1.0.0](https://www.conventionalcommits.org/es/v1.0.0/).

## Contexto

- Estado del repositorio: !`git status --short`
- Cambios preparados (staged): !`git diff --cached`
- Cambios sin preparar: !`git diff`
- Últimos commits (para seguir el estilo): !`git log --oneline -10`

Indicaciones adicionales del usuario: $ARGUMENTS

## Pasos

1. Analiza los cambios. Si no hay nada preparado (staged), añade con `git add` solo los archivos relacionados con el cambio. Nunca añadas secretos (`.env`, credenciales) ni la base de datos `vendehumos.db`.
2. Si los cambios mezclan propósitos distintos (p. ej. una funcionalidad y un refactor no relacionado), propón dividirlos en varios commits en lugar de hacer uno solo.
3. Redacta el mensaje con este formato:

   ```
   <tipo>[ámbito opcional][!]: <descripción>

   [cuerpo opcional]

   [footer(s) opcional(es)]
   ```

4. Haz el commit con `git commit` usando un heredoc para preservar los saltos de línea.
5. Muestra el resultado con `git log --oneline -1`.

## Reglas del mensaje

### Tipos permitidos

| Tipo       | Uso                                                        |
| ---------- | ---------------------------------------------------------- |
| `feat`     | Nueva funcionalidad (MINOR en SemVer)                      |
| `fix`      | Corrección de un bug (PATCH en SemVer)                     |
| `docs`     | Solo documentación                                         |
| `style`    | Formato, puntos y coma, comillas… sin cambiar la lógica    |
| `refactor` | Cambio de código que no corrige un bug ni añade funcionalidad |
| `perf`     | Mejora de rendimiento                                      |
| `test`     | Añadir o corregir tests                                    |
| `build`    | Sistema de build o dependencias (`package.json`, npm)      |
| `ci`       | Configuración de integración continua                      |
| `chore`    | Otras tareas que no tocan código fuente ni tests           |
| `revert`   | Revierte un commit anterior                                |

### Ámbito (scope)

Opcional, entre paréntesis, en minúsculas. Usa la capa o el recurso afectado,
por ejemplo: `controllers`, `services`, `repositories`, `models`, `utils`, `db`,
`vendehumos`.

### Descripción

- En español, en modo imperativo y presente ("añade", no "añadido" ni "añadiendo").
- Empieza en minúscula y **sin punto final**.
- Máximo ~72 caracteres en la primera línea.

### Cuerpo

- Opcional. Separado de la cabecera por una línea en blanco.
- Explica el **qué** y el **porqué**, no el cómo.

### Breaking changes

- Añade `!` tras el tipo/ámbito (`feat(api)!: ...`) **y/o** un footer
  `BREAKING CHANGE: <descripción>`.
- Úsalo cuando cambie el contrato de la API (rutas, campos como `urlFoto` o
  `numVotos`, códigos de estado) o el esquema de la tabla (p. ej. `CATEGORIAS`).

### Footers

- Formato `Token: valor` o `Token #valor` (p. ej. `Refs: #12`, `Closes #34`).
- Termina siempre el mensaje con:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`

## Ejemplos

```
feat(vendehumos): añade paginación al endpoint GET /vendehumos
```

```
fix(utils): valida que la categoría pertenezca a CATEGORIAS
```

```
refactor(controllers)!: renombra el campo votos a numVotos

BREAKING CHANGE: las respuestas devuelven numVotos en lugar de votos.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
```

## Restricciones

- No uses `--no-verify` ni `--amend` salvo que el usuario lo pida.
- No hagas `git push`.
- Si un hook de pre-commit falla, corrige el problema y crea un commit nuevo.
