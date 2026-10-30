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
| `npm run seed`               | Completa la plantilla de parámetros en las organizaciones existentes    |
| `npm run typecheck`          | Revisión de tipos                                                       |
| `npm run lint`               | Revisión de estilo                                                      |
| `npm run build`              | Compila la versión de producción                                        |
| `npm run ventana-despliegue` | Indica si ahora se puede desplegar a producción                         |

## Estructura

```
src/
  app/        pantallas y API (Next.js App Router)
    (auth)/     ingresar, dos pasos, recuperar clave, aceptar invitación
    (crm)/      barra lateral con la marca y pantallas del CRM
    (desarrollo)/sistema  todos los componentes en modo oscuro y claro (solo en desarrollo)
  components/
    ui/         componentes base del sistema de diseño; solo usan tokens (bg-superficie, text-texto…)
    marca/      aplica la marca de la organización y el modo claro u oscuro
  lib/
    auth/       Better Auth: configuración, sesión con organización activa, auditoría
    permisos/   roles ADMIN, SOCIO y ASESOR y matriz de permisos (CL-CRM-02 §11)
    db/         Prisma con aislamiento por organización (RN-02)
  modules/    reglas de negocio por módulo (CL-CRM-05)
    calendario/  horario, festivos y reloj hábil (RN-03 a RN-05)
    sla/         vencimiento y escalamiento (RN-14 en adelante)
    parametros/  parámetros, diccionarios y plantilla por sector (RN-01)
    marca/       colores, fuentes y logos por organización, con contraste AA
    empresas/    empresas y contactos: duplicados, no contactar y supresión (RN-07 a RN-09, RN-47)
docs/
  decisiones/ registro de decisiones con fecha, quién y por qué
```

La interfaz no usa colores fijos: la paleta de Tailwind está apagada en `globals.css` y una prueba rechaza cualquier hex o clase como `bg-zinc-100`. Los colores salen de la marca de cada organización (Configuración → Marca).

Cada módulo separa `dominio/` (reglas puras, sin Prisma ni Next.js), `aplicacion/`, `infraestructura/` y `pruebas/`. Cada función de regla cita su identificador RN y cada prueba empieza con él.
