# Correcciones a la documentación v2.0

- **Fecha:** 30 de octubre de 2026
- **Propone:** Claude (revisión de CL-CRM-00 a CL-CRM-07), a pedido de Arlez Camilo Cerón Herrera
- **Estado:** propuesta; vigente para el desarrollo mientras los socios no decidan otra cosa
- **Afecta:** CL-CRM-01, 02, 03, 04, 05, 06 y 07. Al publicar la versión 2.1 de la documentación, cada punto se incorpora en su documento y aquí se anota "incorporado en 2.1".

Cada decisión tiene un identificador `D-xx`. El código que la aplica la cita en un comentario, igual que las reglas RN.

## Inconsistencias de gravedad alta

### D-01 · El corte antes del cierre solo aplica a la llegada del lead

- **Conflicto:** RN-14 aplica `inicioEfectivo` sobre `asignada_en`, que cambia en cada escalamiento. El ejemplo de CL-CRM-05 §4 dice que el corte solo aplica a la llegada (tarea escalada a las 16:55, vence martes 08:05).
- **Decisión:** gana el ejemplo. RN-14 queda así:
  - Asignación inicial (nivel 0): `vence_en = sumarMinutosHabiles(inicioEfectivo(asignada_en), minutos_sla)`.
  - Escalamiento (niveles 1 a 3): `vence_en = sumarMinutosHabiles(asignada_en, minutos_sla)`, sin corte.
- **Motivo:** el corte existe para no prometerle al cliente un contacto que el reloj no alcanza. Al escalar ya no hay promesa nueva, y aplicarlo regalaría tiempo a una tarea ya vencida.

### D-02 · Los pagos se registran desde la etapa 2

- **Conflicto:** CL-CRM-01 §10 dice que en la etapa 1 los pagos se registran; CL-CRM-02, 05 y 07 ponen Proyectos y pagos en la etapa 2 y no hay horas para ellos en la etapa 1.
- **Decisión:** el módulo de pagos es de la etapa 2. En la etapa 1 los pagos recibidos se anotan en una nota del negocio (o en la hoja actual de los socios) y se cargan al CRM al activar el módulo, con su fecha real, para calcular comisiones de forma retroactiva.
- **Cambio en CL-CRM-01 §10:** "en la etapa 1 los pagos se anotan fuera del módulo y se cargan con su fecha real al iniciar la etapa 2".

### D-03 · El dueño de la comisión es el dueño del negocio, y el escalamiento lo mueve junto con la empresa

- **Conflicto:** RN-39 usa el dueño del negocio (`NEGOCIO.asesor_id`); RN-19 cambia el dueño de la empresa (`EMPRESA.asesor_id`) sin decir qué pasa con el negocio.
- **Decisión:** cuando una asignación cambia el dueño de la empresa (`ASIGNACION.cambia_dueno = true`), en la misma transacción pasan al nuevo dueño los negocios **abiertos** de esa empresa. Los negocios ganados, entregados o perdidos conservan su dueño. RN-39 no cambia: la comisión es del dueño del negocio en la fecha del pago.
- **Motivo:** un lead de rotación que no se atendió no debe dejar un negocio a nombre de quien no lo trabajó, y una venta ya ganada no debe cambiar de dueño por un lead nuevo de la misma empresa.

## Inconsistencias de gravedad media y baja

| ID | Tema | Decisión |
| --- | --- | --- |
| D-04 | Dependencias "o" entre módulos | `MODULO.depende_de` pasa a ser una lista de grupos: el módulo se activa si se cumple **cada** grupo, y un grupo se cumple con **cualquiera** de sus módulos. Seguimiento automático = `[["COTIZACIONES", "CHAT"]]`. |
| D-05 | Parámetros de devolución | Se agregan a CL-CRM-04 §5 `devolucion_requiere_avance = sí` y `devolucion_mes_iniciado = no_devuelve`. |
| D-06 | Staging encendido | Staging queda encendido siempre (cabe en la memoria) e incluye un worker con 256 MB. CL-CRM-06 §10 se corrige. |
| D-07 | Ruta de actividades | La ruta canónica es `POST /api/v1/empresas/:id/actividades`. Se corrige el ejemplo de CL-CRM-06 §15. |
| D-08 | Alertas por WhatsApp | Todas las alertas salen por correo; por WhatsApp solo cuando el canal esté activo. Se corrige CL-CRM-03 §11. |
| D-09 | Payload del sitio | El sitio envía `servicios` como códigos del catálogo (`["LANDING_AGENDA"]`) y `categoria` como código del diccionario; el CRM rechaza códigos desconocidos con 422. |
| D-10 | Ventana de despliegue | La regla vive solo en CL-CRM-06 §11; CL-CRM-03 §13 la referencia. |
| D-11 | Tablero en el núcleo | Cada indicador declara el módulo del que depende; si el módulo está apagado, la tarjeta no se muestra. |
| D-12 | Neutralidad al sector | El "contador de clientes asegurados" (RN-26) es un indicador configurable (`meta_clientes_entregados`), no una regla del acuerdo de socios, y el usuario de respaldo se lee de `usuario_respaldo_id`. |

## Reglas que faltaban

### D-13 · Leads fuera de horario se asignan con el turno del inicio efectivo

La elegibilidad (RN-11) se evalúa en el **inicio efectivo** del lead, no en la hora de llegada. Un lead del domingo se asigna a quien tenga turno el lunes a las 8:00. Si nadie tiene turno en ese momento, va al usuario de respaldo. Sin esta regla, todo lead nocturno o de fin de semana caería en el respaldo.

La disponibilidad (DISPONIBLE, EN_PAUSA…) solo se exige cuando el inicio efectivo es el momento actual, porque nadie marca su estado de mañana.

### D-14 · Cuándo nace y cuándo se cierra un negocio

- Un lead entrante crea un NEGOCIO en la primera etapa abierta solo si la empresa no tiene ya un negocio abierto; si lo tiene, la cotización nueva se cuelga de ese negocio.
- Cuando una cotización vence (RN-32) y el negocio no tiene actividad en `dias_cierre_sin_respuesta` (30 por defecto), el worker lo pasa a PERDIDO con motivo `NO_RESPONDE`.

### D-15 · Quién acepta una cotización

Mientras no exista la aceptación en línea (etapa 4), el asesor dueño, el Socio o el Administrador marcan la cotización como ACEPTADA con el medio de aceptación (correo, WhatsApp, llamada, presencial) y, si existe, el soporte adjunto. Queda en la auditoría.

### D-16 · Guardia de escalamiento

`es_guardia` deja de ser un booleano suelto: la guardia se asigna por turno (TURNO.es_guardia). Si hay varias personas de guardia, el nivel 2 usa la misma rotación equitativa de RN-12. Si no hay nadie de guardia, salta al nivel 3.

### D-17 · Qué detiene el reloj del SLA

Los envíos automáticos del sistema (PDF de la cotización, plantillas de seguimiento) **no** cuentan como intento. Solo cuentan los intentos que registra una persona (RN-15).

### D-18 · Festivos de Colombia calculados

Los festivos de Colombia se calculan con la regla de la Ley 51 de 1983 (Ley Emiliani) y la fecha de Pascua, en `src/modules/calendario/dominio/festivos-colombia.ts`. Ya no hay que cargarlos a mano cada diciembre; la tabla FESTIVO queda para festivos propios de cada organización.

### D-19 · Reloj hábil al final de la franja

`sumarMinutosHabiles` puede devolver exactamente la hora de cierre de una franja (por ejemplo, 16:50 + 10 = 17:00). La franja se trata como `[inicio, fin)` para decidir si un momento es hábil, pero un vencimiento puede caer en `fin`. Así un lead de las 16:50 vence a las 17:00 del mismo día y no a las 8:00 del día siguiente.

## Pendientes para los socios

Estas quedan sin decidir; no bloquean la etapa 1:

- Comisión con descuento: ¿5 % con cualquier descuento o solo desde un umbral?
- Retenciones e IVA en cotizaciones y devoluciones (con el contador).
- Tamaño del equipo comercial y quién hace guardia.
- Control del SLA: ¿basta registrar "no contesta" o se pide evidencia?
