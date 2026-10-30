# CRM CÓDIGO LENGUA

CRM multiempresa de CÓDIGO LENGUA: prospectos, actividades, embudo, cotizaciones en PDF con envío en cascada, reparto de leads con SLA en minutos hábiles, comisiones, metas y bonos.

La especificación está en los documentos CL-CRM-00 a CL-CRM-07 (versión 2.0). Las correcciones posteriores se registran en [`docs/decisiones`](docs/decisiones).

Antes de contribuir, lee el [flujo de trabajo](docs/flujo-de-trabajo.md). En resumen: las ramas salen de `dev`, los PR van contra `dev` y la CI y el despliegue solo corren en el PR de `dev` a `main`.

## Requisitos

- Node.js 22 o superior
- npm
- Docker, para PostgreSQL 16 en local

## Primer arranque

```bash
cp .env.example .env            # y completa BETTER_AUTH_SECRET con: openssl rand -base64 32
cp .env .env.local
docker compose up -d db
npm install
npx prisma migrate deploy
CONTRASENA_ADMIN='una-clave-larga' npm run alta-organizacion -- \
  --nombre "CÓDIGO LENGUA" --slug codigo-lengua --admin-nombre "Tu nombre" --admin-email tu@correo.co
npm run dev
```

No hay registro abierto: la primera organización y su ADMIN se crean con `alta-organizacion`, y el resto del equipo entra por invitación desde **Configuración → Equipo** (`/configuracion/equipo`). Al primer ingreso, el ADMIN debe activar la verificación en dos pasos. Mientras no haya proveedor de correo, los enlaces de invitación se copian desde esa pantalla; en local, los correos se imprimen en la consola.

## Comandos

| Comando                      | Qué hace                                                                |
| ---------------------------- | ----------------------------------------------------------------------- |
| `npm run dev`                | Servidor de desarrollo en http://localhost:3000                         |
| `npm test`                   | Pruebas de las reglas de negocio (Vitest)                               |
| `npm run test:integracion`   | Pruebas contra PostgreSQL (aislamiento, login)                          |
| `npm run test:e2e`           | Flujos completos en el navegador (Playwright); necesita `npm run build` |
| `npm run alta-organizacion`  | Crea una organización con su primer ADMIN                               |
| `npm run typecheck`          | Revisión de tipos                                                       |
| `npm run lint`               | Revisión de estilo                                                      |
| `npm run build`              | Compila la versión de producción                                        |
| `npm run ventana-despliegue` | Indica si ahora se puede desplegar a producción                         |

## Estructura

```
src/
  app/        pantallas y API (Next.js App Router)
    (auth)/     ingresar, dos pasos, recuperar clave, aceptar invitación
  lib/
    auth/       Better Auth: configuración, sesión con organización activa, auditoría
    permisos/   roles ADMIN, SOCIO y ASESOR y matriz de permisos (CL-CRM-02 §11)
    db/         Prisma con aislamiento por organización (RN-02)
  modules/    reglas de negocio por módulo (CL-CRM-05)
    calendario/  horario, festivos y reloj hábil (RN-03 a RN-05)
    sla/         vencimiento y escalamiento (RN-14 en adelante)
docs/
  decisiones/ registro de decisiones con fecha, quién y por qué
```

Cada módulo separa `dominio/` (reglas puras, sin Prisma ni Next.js), `aplicacion/`, `infraestructura/` y `pruebas/`. Cada función de regla cita su identificador RN y cada prueba empieza con él.
