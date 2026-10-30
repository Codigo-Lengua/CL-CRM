import { z } from "zod";

const texto = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Máximo ${max} caracteres.`)
    .transform((v) => v || null)
    .nullable()
    .optional();

const correo = z
  .string()
  .trim()
  .transform((v) => v.toLowerCase())
  .pipe(z.union([z.literal(""), z.email("Revisa el correo.")]))
  .transform((v) => v || null)
  .nullable()
  .optional();

const url = z
  .string()
  .trim()
  .transform((v) => (v && !/^https?:\/\//i.test(v) ? `https://${v}` : v))
  .pipe(
    z.union([z.literal(""), z.url({ protocol: /^https?$/, error: "Revisa la dirección del sitio web." })]),
  )
  .transform((v) => v || null)
  .nullable()
  .optional();

const uuid = z
  .string()
  .trim()
  .transform((v) => v || null)
  .pipe(z.uuid().nullable())
  .optional();

export const esquemaEmpresa = z.object({
  nombre: z.string().trim().min(2, "Escribe el nombre del negocio.").max(120),
  categoriaId: uuid,
  fuenteId: uuid,
  asesorId: uuid,
  canal: z
    .enum(["WEB", "GOOGLE_PLACES", "MANUAL", "WHATSAPP", "INSTAGRAM", "MESSENGER", "ANUNCIO"])
    .default("MANUAL"),
  origenDato: z
    .enum(["FORMULARIO", "FUENTE_PUBLICA", "REFERIDO", "VISITA", "IMPORTACION"])
    .default("FORMULARIO"),
  telefono: texto(40),
  whatsapp: texto(40),
  correo,
  direccion: texto(200),
  localidad: texto(80),
  ciudad: texto(80),
  sitioWeb: url,
  instagram: texto(80),
  googlePlaceId: texto(200),
  campana: texto(120),
  aceptaWhatsapp: z.boolean().default(false),
  notas: texto(2000),
});

export type DatosEmpresa = z.infer<typeof esquemaEmpresa>;

export const esquemaContacto = z
  .object({
    nombre: z.string().trim().min(2, "Escribe el nombre del contacto.").max(120),
    cargo: texto(80),
    telefono: texto(40),
    correo,
    esPrincipal: z.boolean().default(false),
    autorizo: z.boolean().default(false),
    autorizacionOrigen: texto(80),
    autorizacionTexto: texto(500),
    notas: texto(1000),
  })
  .refine((c) => !c.autorizo || c.autorizacionOrigen, {
    message: "Indica cómo dio la autorización (llamada, formulario, WhatsApp…).",
    path: ["autorizacionOrigen"],
  });

export type DatosContacto = z.infer<typeof esquemaContacto>;
