import { z } from "zod";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => v || null)
    .nullable()
    .optional();

const entero = (mensaje: string) =>
  z
    .string()
    .trim()
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(z.number(mensaje).int(mensaje).nonnegative(mensaje).nullable())
    .optional();

/** "1.200.000", "1200000" o "1200000,50" a número. */
export const dinero = z
  .string()
  .trim()
  .min(1, "Escribe el valor.")
  .transform((v) =>
    Number(
      v
        .replace(/[^\d,.-]/g, "")
        .replace(/\./g, "")
        .replace(",", "."),
    ),
  )
  .pipe(z.number("Escribe un valor en números.").nonnegative("El valor no puede ser negativo."));

const dia = z.iso.date("Revisa la fecha.");
const diaOpcional = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(dia.nullable())
  .optional();

const uuid = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable())
  .optional();

const casilla = z.preprocess((v) => v === "on" || v === true || v === "true", z.boolean());

export const esquemaServicio = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,40}$/, "Usa de 2 a 40 letras, números, guion o guion bajo."),
  nombre: z.string().trim().min(2, "Escribe el nombre del servicio.").max(120),
  lineaId: uuid,
  tipo: z.enum(["PROYECTO", "MENSUAL"], "Elige si es proyecto o mensual."),
  incluye: texto(4000),
  entregaDias: entero("Los días de entrega son un número entero."),
  horas: entero("Las horas son un número entero."),
  visibleWeb: casilla,
  requiereCotizacionManual: casilla,
  activo: casilla,
});
export type DatosServicio = z.infer<typeof esquemaServicio>;

export const esquemaPlan = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del plan.").max(60),
  limiteUso: entero("El límite de uso es un número entero."),
  activo: casilla,
});
export type DatosPlan = z.infer<typeof esquemaPlan>;

export const esquemaPrecio = z.object({
  planId: uuid,
  valor: dinero,
  desde: dia,
  hasta: diaOpcional,
});
export type DatosPrecio = z.infer<typeof esquemaPrecio>;

export const esquemaCosto = z.object({
  concepto: z.string().trim().min(2, "Escribe el concepto.").max(80),
  valor: dinero,
  periodicidad: z.enum(["UNICO", "MENSUAL", "ANUAL"]),
});
export type DatosCosto = z.infer<typeof esquemaCosto>;

export const esquemaImpuesto = z.object({
  codigo: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9_-]{2,20}$/, "Usa de 2 a 20 letras, números, guion o guion bajo."),
  nombre: z.string().trim().min(2, "Escribe el nombre.").max(60),
  tipo: z.enum(["TRASLADADO", "RETENIDO"]),
  porcentaje: z
    .string()
    .trim()
    .transform((v) => (v === "" ? Number.NaN : Number(v.replace(",", "."))))
    .pipe(
      z
        .number("El porcentaje es un número.")
        .min(0, "El porcentaje va de 0 a 100.")
        .max(100, "El porcentaje va de 0 a 100."),
    ),
  incluidoEnPrecio: casilla,
  desde: dia,
  hasta: diaOpcional,
  activo: casilla,
});
export type DatosImpuesto = z.infer<typeof esquemaImpuesto>;
