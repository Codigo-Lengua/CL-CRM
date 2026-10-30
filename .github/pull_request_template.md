## Issue

<!-- La de la rama: feat/<idIssue>-<descripcion>/<agente>. La verificación nombre-de-rama exige esta línea. -->

Cierra #

## Qué cambia

<!-- Una o dos frases. Título del PR: tipo(modulo): Descripción en imperativo. -->

## Módulo y reglas

- **Módulo:**
- **Reglas RN:**
- **Decisiones D:**
- **Carpetas que toca:**

## Pruebas

<!-- Pruebas agregadas o modificadas, y cómo se verificó en local. -->

## Lista de chequeo

- [ ] La rama sale de `dev`, se llama `<tipo>/<idIssue>-<descripcion>/<agente>` y el PR va contra `dev`
- [ ] `npm run format:check`, `npm run lint`, `npm run typecheck` y `npm test` pasan en local
- [ ] Solo toca las carpetas que le asigna su issue
- [ ] Toda regla RN nueva o modificada tiene prueba que empieza con su identificador
- [ ] No hay valores de negocio en el código (se leen con Parametros.obtener)
- [ ] Si hay migración: se generó con la rama al día con `dev` y es compatible con la versión anterior
- [ ] Si toca permisos, Better Auth, comisiones o dinero: revisión de seguridad hecha
