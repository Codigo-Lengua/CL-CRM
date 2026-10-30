# CRM CÓDIGO LENGUA

CRM multiempresa de CÓDIGO LENGUA: prospectos, actividades, embudo, cotizaciones en PDF con envío en cascada, reparto de leads con SLA en minutos hábiles, comisiones, metas y bonos.

La especificación está en los documentos CL-CRM-00 a CL-CRM-07 (versión 2.0). Las correcciones posteriores se registran en [`docs/decisiones`](docs/decisiones).

## Requisitos

- Node.js 22 o superior
- npm

## Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en http://localhost:3000 |
| `npm test` | Pruebas de las reglas de negocio (Vitest) |
| `npm run typecheck` | Revisión de tipos |
| `npm run lint` | Revisión de estilo |
| `npm run build` | Compila la versión de producción |

## Estructura

```
src/
  app/        pantallas y API (Next.js App Router)
  modules/    reglas de negocio por módulo (CL-CRM-05)
    calendario/  horario, festivos y reloj hábil (RN-03 a RN-05)
    sla/         vencimiento y escalamiento (RN-14 en adelante)
docs/
  decisiones/ registro de decisiones con fecha, quién y por qué
```

Cada módulo separa `dominio/` (reglas puras, sin Prisma ni Next.js), `aplicacion/`, `infraestructura/` y `pruebas/`. Cada función de regla cita su identificador RN y cada prueba empieza con él.
