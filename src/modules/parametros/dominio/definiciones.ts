import { z } from "zod";
import type { DiaSemana, FranjaHoraria } from "@/modules/calendario/dominio/calendario";

export type TipoParametro = "NUMERO" | "TEXTO" | "BOOLEANO" | "HORARIO" | "JSON";
export type EditablePor = "ADMIN" | "PLATAFORMA";

export type Horario = Partial<Record<DiaSemana, FranjaHoraria[]>>;

/** Una clave de CONFIGURACION: cómo se valida, quién la cambia y su valor por defecto. */
/** Sección de la pantalla de configuración en que aparece la clave. */
export type GrupoParametro = "atencion" | "comercial" | "cotizaciones" | "comisiones" | "plataforma";

export const NOMBRE_GRUPO: Record<GrupoParametro, string> = {
  atencion: "Atención y tiempos de respuesta",
  comercial: "Reparto y cartera",
  cotizaciones: "Cotizaciones",
  comisiones: "Comisiones y devoluciones",
  plataforma: "Límites de la plataforma",
};

export interface DefinicionParametro<T> {
  nombre: string;
  grupo: GrupoParametro;
  tipo: TipoParametro;
  descripcion: string;
  editablePor: EditablePor;
  esquema: z.ZodType<T>;
  porDefecto: T;
}

const HORA = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;

const esquemaFranja = z
  .object({
    inicio: z.string().regex(HORA, "Usa el formato HH:mm"),
    fin: z.string().regex(HORA, "Usa el formato HH:mm"),
  })
  .refine((f) => f.inicio < f.fin, "La hora de cierre debe ser posterior a la de apertura");

const esquemaHorario: z.ZodType<Horario> = z
  .partialRecord(z.enum(["1", "2", "3", "4", "5", "6", "7"]), z.array(esquemaFranja))
  .transform((horario) => horario as Horario);

const entero = (min: number, max: number) =>
  z
    .number({ error: "Escribe un número." })
    .int("Usa un número entero.")
    .min(min, `El mínimo es ${min}.`)
    .max(max, `El máximo es ${max}.`);

function definir<T>(definicion: DefinicionParametro<T>): DefinicionParametro<T> {
  return definicion;
}

const semana = [{ inicio: "08:00", fin: "17:00" }];

/**
 * Claves de CONFIGURACION (CL-CRM-04 §5). El valor por defecto es el de CÓDIGO LENGUA y
 * también el de la plantilla general. País, zona horaria y moneda viven en
 * perfil_organizacion porque los usa todo el producto.
 */
export const DEFINICIONES = {
  horario_atencion: definir<Horario>({
    nombre: "Horario de atención",
    grupo: "atencion",
    tipo: "HORARIO",
    descripcion: "Franjas de atención por día. Solo cuentan los minutos dentro de este horario.",
    editablePor: "ADMIN",
    esquema: esquemaHorario,
    porDefecto: {
      1: semana,
      2: semana,
      3: semana,
      4: semana,
      5: semana,
      6: [{ inicio: "08:00", fin: "13:00" }],
    },
  }),
  minutos_sla_primer_contacto: definir({
    nombre: "Tiempo para el primer contacto",
    grupo: "atencion",
    tipo: "NUMERO",
    descripcion: "Minutos hábiles que tiene el asesor para el primer contacto antes de escalar.",
    editablePor: "ADMIN",
    esquema: entero(1, 1440),
    porDefecto: 10,
  }),
  minutos_corte_cierre: definir({
    nombre: "Corte antes del cierre",
    grupo: "atencion",
    tipo: "NUMERO",
    descripcion:
      "Las solicitudes que llegan a menos de estos minutos del cierre pasan al siguiente día hábil.",
    editablePor: "ADMIN",
    esquema: entero(0, 240),
    porDefecto: 10,
  }),
  niveles_escalamiento: definir({
    nombre: "Niveles de escalamiento",
    grupo: "atencion",
    tipo: "NUMERO",
    descripcion: "Niveles de escalamiento antes de alertar a todo el equipo.",
    editablePor: "ADMIN",
    esquema: entero(1, 10),
    porDefecto: 3,
  }),
  minutos_reintento_contacto: definir({
    nombre: "Recordatorio de nuevo intento",
    grupo: "atencion",
    tipo: "NUMERO",
    descripcion: "Minutos para recordar un nuevo intento si el primero no fue efectivo.",
    editablePor: "ADMIN",
    esquema: entero(1, 1440),
    porDefecto: 30,
  }),
  minutos_alerta_pausa: definir({
    nombre: "Alerta por pausa prolongada",
    grupo: "atencion",
    tipo: "NUMERO",
    descripcion: "Minutos de pausa de un asesor antes de avisar al administrador.",
    editablePor: "ADMIN",
    esquema: entero(1, 480),
    porDefecto: 30,
  }),
  capacidad_negocios_asesor: definir({
    nombre: "Capacidad de negocios por asesor",
    grupo: "comercial",
    tipo: "NUMERO",
    descripcion: "Negocios abiertos máximos por asesor. Cada perfil puede tener su propio límite.",
    editablePor: "ADMIN",
    esquema: entero(1, 1000),
    porDefecto: 30,
  }),
  dias_proteccion_cartera: definir({
    nombre: "Protección de cartera",
    grupo: "comercial",
    tipo: "NUMERO",
    descripcion: "Días que un lead sigue siendo del asesor que lo trabajó.",
    editablePor: "ADMIN",
    esquema: entero(1, 365),
    porDefecto: 60,
  }),
  vigencia_cotizacion_dias: definir({
    nombre: "Vigencia de la cotización",
    grupo: "cotizaciones",
    tipo: "NUMERO",
    descripcion: "Días de vigencia de una cotización.",
    editablePor: "ADMIN",
    esquema: entero(1, 180),
    porDefecto: 15,
  }),
  correo_obligatorio_cotizador: definir({
    nombre: "Correo obligatorio en el cotizador",
    grupo: "cotizaciones",
    tipo: "BOOLEANO",
    descripcion: "El cotizador del sitio pide correo para garantizar el envío de respaldo.",
    editablePor: "ADMIN",
    esquema: z.boolean({ error: "Elige sí o no." }),
    porDefecto: true,
  }),
  dias_seguimiento_cliente: definir<number[]>({
    nombre: "Días de seguimiento",
    grupo: "cotizaciones",
    tipo: "JSON",
    descripcion: "Días después de enviar la cotización en que se hace seguimiento automático.",
    editablePor: "ADMIN",
    esquema: z
      .array(entero(1, 90))
      .min(1, "Escribe al menos un día.")
      .max(10, "Máximo 10 seguimientos.")
      .refine(
        (dias) => dias.every((d, i) => i === 0 || d > dias[i - 1]!),
        "Los días deben ir en orden creciente",
      ),
    porDefecto: [2, 5, 10],
  }),
  dia_liquidacion: definir({
    nombre: "Día de liquidación",
    grupo: "comisiones",
    tipo: "NUMERO",
    descripcion: "Día del mes en que se liquidan las comisiones del mes anterior.",
    editablePor: "ADMIN",
    esquema: entero(1, 28),
    porDefecto: 5,
  }),
  devolucion_plazo_dias: definir({
    nombre: "Plazo para pedir devolución",
    grupo: "comisiones",
    tipo: "NUMERO",
    descripcion: "Días después del pago en que el cliente puede pedir devolución.",
    editablePor: "ADMIN",
    esquema: entero(0, 365),
    porDefecto: 30,
  }),
  devolucion_plazo_pago_dias: definir({
    nombre: "Plazo para pagar la devolución",
    grupo: "comisiones",
    tipo: "NUMERO",
    descripcion: "Días para pagar una devolución aprobada.",
    editablePor: "ADMIN",
    esquema: entero(1, 90),
    porDefecto: 15,
  }),
  devolucion_meses_arrastre: definir({
    nombre: "Meses de arrastre de la devolución",
    grupo: "comisiones",
    tipo: "NUMERO",
    descripcion: "Meses en que una devolución se sigue descontando de las comisiones.",
    editablePor: "ADMIN",
    esquema: entero(0, 24),
    porDefecto: 3,
  }),
  usuario_respaldo_id: definir<string | null>({
    nombre: "Persona de respaldo",
    grupo: "comercial",
    tipo: "TEXTO",
    descripcion: "Persona que recibe los leads cuando no hay asesores disponibles.",
    editablePor: "ADMIN",
    esquema: z.uuid({ error: "Elige una persona del equipo." }).nullable(),
    porDefecto: null,
  }),
  api_limite_por_minuto: definir({
    nombre: "Límite de la API por minuto",
    grupo: "plataforma",
    tipo: "NUMERO",
    descripcion: "Solicitudes por minuto que acepta la API pública de la organización.",
    editablePor: "PLATAFORMA",
    esquema: entero(1, 10_000),
    porDefecto: 60,
  }),
  webhook_fallos_pausa: definir({
    nombre: "Fallos antes de pausar un webhook",
    grupo: "plataforma",
    tipo: "NUMERO",
    descripcion: "Fallos seguidos de un webhook saliente antes de pausarlo.",
    editablePor: "PLATAFORMA",
    esquema: entero(1, 1000),
    porDefecto: 20,
  }),
} as const;

export type ClaveParametro = keyof typeof DEFINICIONES;
export type ValorParametro<K extends ClaveParametro> =
  (typeof DEFINICIONES)[K] extends DefinicionParametro<infer T> ? T : never;

export const CLAVES = Object.keys(DEFINICIONES) as ClaveParametro[];

export function esClave(valor: string): valor is ClaveParametro {
  return Object.hasOwn(DEFINICIONES, valor);
}

/** Valida un valor contra su clave. Devuelve el valor normalizado o el mensaje de error. */
export function validarParametro<K extends ClaveParametro>(
  clave: K,
  valor: unknown,
): { ok: true; valor: ValorParametro<K> } | { ok: false; error: string } {
  const resultado = (DEFINICIONES[clave].esquema as z.ZodType<ValorParametro<K>>).safeParse(valor);
  return resultado.success
    ? { ok: true, valor: resultado.data }
    : { ok: false, error: resultado.error.issues[0]?.message ?? "Valor inválido" };
}
