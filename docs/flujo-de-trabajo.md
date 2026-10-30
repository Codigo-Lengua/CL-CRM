# Flujo de trabajo, CI y despliegues

- **Versión:** 1.1 · 30 de octubre de 2026
- **Base:** CL-CRM-03 §13 y CL-CRM-06 §9 a §11. Donde este documento es más específico, manda este documento, y CL-CRM-06 lo referencia en su versión 2.1.
- **Responsable técnico:** Camilo (Arlez Camilo Cerón Herrera)

## Resumen

Todo el trabajo sale de `dev` y vuelve a `dev` por pull request. Cuando un conjunto de cambios está listo, se abre un PR de `dev` a `main`: **solo ese PR corre la integración continua**, y al fusionarlo corre el despliegue.

```
dev ──▶ feat/<id>-…/<agente> ──PR (squash)──▶ dev ──PR dev → main (CI)──▶ main ──CD──▶ producción
          │                         │
          etiqueta automática       cada fusión actualiza los PR abiertos contra dev
```

## 1. Ramas

Formato de toda rama de trabajo:

```
<tipo>/<idIssue>-<descripcion>/<agente>
```

| Parte         | Valores                                                                      | Ejemplo                       |
| ------------- | ---------------------------------------------------------------------------- | ----------------------------- |
| `tipo`        | `feat`, `fix`, `hotfix`, `docs`, `diseno`, `ci`                              | `feat`                        |
| `idIssue`     | Número de la issue que resuelve; toda rama tiene issue                       | `18`                          |
| `descripcion` | Minúscula, en español, con guiones                                           | `reparto-rotacion-equitativa` |
| `agente`      | Línea dueña (sección 10): `plataforma`, `comercial`, `cotizacion`, `reparto` | `reparto`                     |

Ejemplo completo: `feat/18-reparto-rotacion-equitativa/reparto`.

| Rama                                 | Para qué                                                            | Sale de | Se fusiona en        |
| ------------------------------------ | ------------------------------------------------------------------- | ------- | -------------------- |
| `main`                               | Lo que está en producción                                           | —       | —                    |
| `dev`                                | Integración del trabajo terminado; rama por defecto del repositorio | `main`  | `main`, solo por PR  |
| `feat/<id>-<descripcion>/<agente>`   | Funcionalidad nueva                                                 | `dev`   | `dev`                |
| `fix/<id>-<descripcion>/<agente>`    | Corrección                                                          | `dev`   | `dev`                |
| `docs/<id>-<descripcion>/<agente>`   | Documentación                                                       | `dev`   | `dev`                |
| `diseno/<id>-<descripcion>/<agente>` | Pantallas, estilos, componentes visuales                            | `dev`   | `dev`                |
| `ci/<id>-<descripcion>/<agente>`     | Integración continua, despliegue y herramientas del repositorio     | `dev`   | `dev`                |
| `hotfix/<id>-<descripcion>/<agente>` | Corrección urgente de producción (sección 7)                        | `main`  | `main` y luego `dev` |

Reglas:

- La verificación `nombre-de-rama` falla en el PR si el nombre no cumple el formato, si la issue no existe o si el cuerpo del PR no tiene `Cierra #<idIssue>`.
- Una issue, una rama, un pull request. Si un cambio no tiene issue, primero se crea la issue.
- Nadie empuja directo a `dev` ni a `main`.
- La rama se borra al fusionar.

## 2. Commits

Mensajes en español y en imperativo (CL-CRM-06 §9), con un prefijo de tipo:

```
<tipo>(<modulo>): <qué hace, en imperativo, máximo 72 caracteres>

<por qué, si no es obvio>

Reglas: RN-14, D-01
Cierra #12
```

| Tipo                                                  | Uso                                                          |
| ----------------------------------------------------- | ------------------------------------------------------------ |
| `feat`                                                | Funcionalidad nueva                                          |
| `fix`                                                 | Corrección                                                   |
| `regla`                                               | Cambio en una regla de negocio RN existente; exige su prueba |
| `migracion`                                           | Cambio de esquema de base de datos                           |
| `docs`, `diseno`, `pruebas`, `ci`, `refactor`, `deps` | Sin cambio funcional                                         |

Ejemplos: `feat(reparto): Agregar rotación equitativa entre asesores elegibles` · `fix(calendario): Respetar festivos propios de la organización`.

**Autoría.** Todos los commits y pull requests salen a nombre de Arlez Camilo Cerón Herrera. Los mensajes no llevan líneas `Co-Authored-By` ni firmas de herramientas.

## 3. Pull requests

### Hacia `dev`

- Se abren contra `dev` (es la rama por defecto, así que GitHub lo propone solo).
- Usan la plantilla `.github/pull_request_template.md`: módulo, issue, reglas RN, pruebas y archivos que toca.
- Reciben una **etiqueta automática** según el prefijo de la rama (sección 4).
- Deben estar **al día con `dev`**: la verificación `al-dia-con-dev` bloquea la fusión si la rama quedó atrás, y cada fusión a `dev` actualiza sola los demás PR abiertos (sección 5).
- Antes de abrir el PR, quien lo sube corre en local `npm run format:check && npm run lint && npm run typecheck && npm test`. En estos PR no corre la integración continua.
- Se fusionan con **squash**: el título del PR queda como único commit en `dev`.

### De `dev` a `main`

- Solo se aceptan PR cuya rama de origen sea `dev`; cualquier otro origen falla la verificación `origen-dev`.
- Aquí corre la **integración continua completa** (sección 6). No se fusiona en rojo.
- Se fusionan con **merge commit**, no con squash, para que `dev` y `main` compartan historia y el siguiente PR no tenga conflictos.
- Al fusionar corre el **despliegue** (sección 7).

## 4. Etiquetas

| Etiqueta        | Cuándo                                           | Asignación automática por rama |
| --------------- | ------------------------------------------------ | ------------------------------ |
| `mejora`        | Funcionalidad nueva o mejora de una existente    | `feat/`                        |
| `bug`           | Corrección de un error                           | `fix/`, `hotfix/`              |
| `documentacion` | Solo documentación                               | `docs/`                        |
| `diseno`        | Pantallas, estilos, componentes visuales         | `diseno/`                      |
| `ci`            | Integración continua, despliegue, lint y formato | `ci/`                          |

La etiqueta se puede corregir a mano si la rama no describe bien el cambio. Las issues usan las mismas etiquetas y un **hito** por etapa.

## 5. Trabajo en paralelo sin pisarse

Varias personas o agentes trabajan a la vez. Para que no choquen:

1. **Una issue por responsable.** Cada issue dice qué módulo y qué carpetas le pertenecen. Nadie modifica carpetas de otra issue abierta.
2. **Archivos compartidos con dueño.** `package.json`, `prisma/schema/base.prisma`, `src/lib/`, el menú de navegación y `.github/` solo se cambian en issues de la línea Plataforma. Si otra línea necesita algo ahí, lo pide en su issue.
3. **Esquema dividido.** Cada módulo tiene su propio archivo en `prisma/schema/<modulo>.prisma`, así dos cambios de esquema no tocan el mismo archivo.
4. **Migraciones al final.** La migración se genera justo antes de abrir el PR, con la rama ya actualizada con `dev`, para que el orden de migraciones sea el real.
5. **Actualización automática.** Cada vez que algo entra a `dev`, el workflow `actualizar-prs` fusiona `dev` en todos los PR abiertos contra `dev`. Si hay conflicto, comenta en el PR y lo marca con `conflicto` para que su responsable lo resuelva.
6. **Fronteras de módulos.** Un módulo solo usa la interfaz pública de otro (`src/modules/<modulo>/index.ts`), nunca sus carpetas internas (CL-CRM-03 §4).

## 6. Integración continua

Corre **solo** en los PR de `dev` a `main`. Ningún paso se puede saltar para fusionar.

| Paso                 | Qué verifica                                                             | Estado                                    |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------------------- |
| Origen               | El PR viene de `dev`                                                     | Activo                                    |
| Formato              | `prettier --check` sobre todo el repositorio                             | Activo                                    |
| Lint                 | ESLint sin errores ni advertencias                                       | Activo                                    |
| Tipos                | `next typegen` + TypeScript estricto                                     | Activo                                    |
| Pruebas unitarias    | Todas las reglas RN con Vitest                                           | Activo                                    |
| Dependencias         | `npm audit --audit-level=high`                                           | Activo                                    |
| Build                | La aplicación compila                                                    | Activo                                    |
| Imagen               | La imagen Docker se construye (sin publicar)                             | Activo                                    |
| Secretos             | gitleaks sobre todo el historial                                         | Activo                                    |
| Migraciones          | Se aplican con `prisma migrate deploy` sobre PostgreSQL limpio           | Activo                                    |
| Integración          | Pruebas `*.int.test.ts` contra PostgreSQL (aislamiento por organización) | Activo                                    |
| Fronteras de módulos | Ningún módulo importa el interior de otro                                | Con el segundo módulo con infraestructura |
| Flujos completos     | Playwright sobre el build y PostgreSQL de prueba (`npm run test:e2e`)    | Activo                                    |
| Contrato de la API   | oasdiff contra la versión publicada                                      | Etapa 2                                   |

**Estilo y formato.** Prettier (con `prettier-plugin-tailwindcss`, que ordena las clases) da el formato y ESLint revisa el código: la configuración de Next, reglas de `typescript-eslint` que usan los tipos (promesas sin `await`, `switch` incompletos, imports de tipos) y `eslint-config-prettier` para que no choquen. `.editorconfig` fija UTF-8, LF y dos espacios. Husky corre `lint-staged` antes de cada commit: formatea y revisa solo los archivos que cambian. `npm run format` formatea todo el repositorio.

Un paso rojo nunca se desactiva para fusionar: se corrige la causa con un PR a `dev` y se actualiza el PR a `main`.

## 7. Despliegue

Corre al fusionar el PR de `dev` a `main`:

1. Se construye la imagen Docker **una sola vez** en GitHub Actions y se publica en `ghcr.io/codigo-lengua/cl-crm` con el SHA y la etiqueta `production`. No se compila en el VPS, porque Next.js puede pedir entre 1,5 y 3 GB de memoria (CL-CRM-03 §9).
2. Se revisa la **ventana de despliegue** con el módulo calendario: lunes a jueves, antes de las 8:00 a. m. o después de las 5:00 p. m., sin festivos y sin los días 4 y 5 de cada mes. Fuera de la ventana el despliegue queda en espera de aprobación manual.
3. El ambiente `production` de GitHub pide la aprobación de Camilo.
4. Si hay migraciones, se toma un respaldo cifrado; si falla, se cancela.
5. Se llama al webhook de Coolify. Coolify corre `npx prisma migrate deploy` y luego reinicia la web y el worker.
6. Se verifica `/api/health` durante 3 minutos y se anota la versión desplegada.

Mientras Coolify no esté configurado, el paso 5 queda apagado con la variable del repositorio `DESPLIEGUE_ACTIVO`.

### Rollback

- Sin migración: en Coolify, volver a la imagen anterior.
- Con migración: nunca se borran tablas; se publica una migración correctiva como hotfix.

### Hotfix

1. Rama `hotfix/<id>-<descripcion>/<agente>` desde `main`; PR contra `main` (excepción a la regla de origen, marcada con la etiqueta `bug` y el prefijo `hotfix/`).
2. Corre la CI completa y el despliegue con aprobación.
3. Inmediatamente después, PR de `main` a `dev` para que `dev` no pierda la corrección.

## 8. Migraciones de base de datos

- Todo cambio de tablas va en `prisma/schema/<modulo>.prisma` con una migración de nombre descriptivo.
- Nunca se edita una migración ya fusionada en `dev`.
- Las migraciones deben ser compatibles con la versión anterior del código.
- Destructivas (borrar, renombrar, cambiar tipos) en dos entregas: primero agregar y copiar; después, en otro PR a `main`, borrar.

## 9. Versiones

Versionado semántico. Cada PR de `dev` a `main` que se fusiona crea una versión `vX.Y.Z` con las notas generadas de los títulos de los PR. `v0.x` mientras se construye la etapa 1; `v1.0.0` es la entrega funcional completa.

## 10. Agentes de IA

### Líneas de trabajo

El proyecto se reparte en **4 líneas**, una por agente, cada una dueña de sus carpetas. Como mucho trabajan **3 a la vez**: la línea Plataforma arranca sola porque las demás dependen de su base.

| Línea              | Issues de la etapa 1                                                                                                        | Carpetas propias                                                                                                     | Arranca                                 |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| Plataforma         | #3 esquema y aislamiento, #4 Better Auth, #5 parámetros, #11 respaldo, #12 Coolify, #15 worker, #21 módulos, #22 Playwright | `prisma/schema/base.prisma`, `auth.prisma`, `src/lib/`, `src/worker/`, `src/app/(auth)/`, `.github/`, `package.json` | Primero, sola, hasta cerrar #3, #4 y #5 |
| Comercial          | #6 empresas, #7 actividades, #8 demos, #9 embudo, #10 importación, #20 tablero                                              | `src/modules/{empresas,actividades,demos,embudo,tablero}/` y sus pantallas                                           | Al cerrar #5                            |
| Cotización y envío | #13 catálogo, #14 cotización y PDF, #16 cascada de envío                                                                    | `src/modules/{catalogo,cotizaciones,envios}/` y sus pantallas                                                        | Al cerrar #5                            |
| Reparto y SLA      | #17 leads, #18 reparto, #19 SLA                                                                                             | `src/modules/{leads,reparto,sla,calendario}/`                                                                        | Al cerrar #6 y #15                      |

Orden dentro de cada línea: el de los números de issue. Cada issue dice de qué otras depende; un agente no empieza una issue con dependencias abiertas.

### Reglas

- Toman una issue a la vez, trabajan en su rama desde `dev` y abren el PR contra `dev`.
- Solo tocan las carpetas que su issue les asigna.
- Nunca fusionan, aprueban ni crean versiones; nunca abren el PR de `dev` a `main`.
- No tienen acceso a secretos de producción, a Coolify ni al VPS.
- Sus commits y PR salen a nombre de Arlez, sin firmas de herramientas.

## 11. Configuración de GitHub

| Ajuste                   | Valor                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Rama por defecto         | `dev`                                                                                                     |
| Protección de `dev`      | Solo por PR; verificaciones `al-dia-con-dev` (estricta) y `nombre-de-rama` obligatorias; historial lineal |
| Protección de `main`     | Solo por PR; verificaciones `origen-dev`, `verificar` y `secretos` obligatorias                           |
| Fusiones permitidas      | Squash (hacia `dev`) y merge commit (de `dev` a `main`)                                                   |
| Borrar ramas al fusionar | Activado                                                                                                  |
| Ambiente `production`    | Revisor obligatorio: Camilo; secreto `COOLIFY_WEBHOOK_PRODUCTION` y `COOLIFY_TOKEN`                       |

Los secretos de la aplicación viven solo en Coolify y en el gestor de contraseñas.

## 12. Día a día

1. `git switch dev && git pull`
2. `git switch -c feat/<idIssue>-<descripcion>/<agente>`
3. Programar con pruebas; antes de subir: `npm run format:check && npm run lint && npm run typecheck && npm test`.
4. `git push -u origin <rama>` y abrir el PR contra `dev` con la plantilla.
5. Revisión → **Squash and merge**.
6. Cuando `dev` tenga un conjunto listo: PR de `dev` a `main` → CI → **Merge commit** → despliegue.
