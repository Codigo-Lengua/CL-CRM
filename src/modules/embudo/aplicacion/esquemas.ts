import { z } from "zod";

const fecha = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.iso.date("Revisa la fecha.").nullable())
  .transform((v) => (v ? new Date(`${v}T00:00:00Z`) : null))
  .optional();

const valor = z
  .string()
  .trim()
  .transform((v) =>
    v
      .replace(/[^\d,.-]/g, "")
      .replace(/\./g, "")
      .replace(",", "."),
  )
  .transform((v) => (v ? Number(v) : null))
  .pipe(z.number("Escribe un valor en números.").nonnegative("El valor no puede ser negativo.").nullable())
  .optional();

const uuid = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable())
  .optional();

export const esquemaNegocio = z.object({
  nombre: z.string().trim().min(2, "Describe el negocio en pocas palabras.").max(120),
  valorEstimado: valor,
  cierreEstimado: fecha,
  asesorId: uuid,
});

export type DatosNegocio = z.infer<typeof esquemaNegocio>;

export const esquemaEtapa = z.object({
  id: z.uuid().optional(),
  nombre: z.string().trim().min(2, "Cada etapa necesita un nombre.").max(60),
  tipoSistema: z.enum(["ABIERTA", "GANADA", "ENTREGADA", "PERDIDA"]),
  limiteAsesor: z.boolean(),
  probabilidad: z
    .number()
    .int()
    .min(0, "La probabilidad va de 0 a 100.")
    .max(100, "La probabilidad va de 0 a 100."),
  activo: z.boolean(),
});

export const esquemaEtapas = z.array(esquemaEtapa).min(4, "El embudo necesita al menos cuatro etapas.");
export type DatosEtapa = z.infer<typeof esquemaEtapa>;
