import { z } from "zod";
import { esHex, type Hex } from "./contraste";

/**
 * Fuentes que la aplicación precarga. Una organización elige entre ellas; agregar otra
 * implica cargarla en src/app/fuentes.ts.
 */
export const FUENTES_TEXTO = ["Montserrat", "Poppins"] as const;
export const FUENTES_TITULOS = ["Orbitron", "Exo 2"] as const;

export type FuenteTexto = (typeof FUENTES_TEXTO)[number];
export type FuenteTitulos = (typeof FUENTES_TITULOS)[number];

/** Los seis colores de una marca. El resto de la interfaz se deriva de ellos. */
export interface ColoresMarca {
  /** Fondo principal en modo oscuro. */
  fondo: Hex;
  /** Acciones principales y foco. */
  primario: Hex;
  /** Hover y estados activos. */
  acento: Hex;
  /** Líneas de luz, bordes y gráficas. */
  brillo: Hex;
  /** Superficies oscuras secundarias. */
  secundario: Hex;
  /** Fondo en modo claro y texto en modo oscuro. */
  lienzo: Hex;
}

export interface Marca {
  nombreComercial: string;
  colores: ColoresMarca;
  fuentes: { texto: FuenteTexto; titulos: FuenteTitulos };
  /** Rutas públicas o URLs de los logos. */
  logos: { completo: string; isotipo: string; logotipo: string };
}

/** Tema por defecto: CÓDIGO LENGUA. */
export const MARCA_CODIGO_LENGUA: Marca = {
  nombreComercial: "CÓDIGO LENGUA",
  colores: {
    fondo: "#0F1324",
    primario: "#B263DF",
    acento: "#A44FCA",
    brillo: "#CB8EEA",
    secundario: "#592B65",
    lienzo: "#F4EEFA",
  },
  fuentes: { texto: "Montserrat", titulos: "Orbitron" },
  logos: {
    completo: "/marca/codigo-lengua/logo.webp",
    isotipo: "/marca/codigo-lengua/isotipo.webp",
    logotipo: "/marca/codigo-lengua/logotipo.jpg",
  },
};

const color = z
  .string()
  .trim()
  .refine(esHex, "Usa un color en formato #RRGGBB.")
  .transform((v) => v.toUpperCase() as Hex);

/** Ruta pública propia o URL https; nunca javascript: ni data:. */
const rutaLogo = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => /^\/[\w./-]+$/.test(v) || /^https:\/\/[^\s"'<>]+$/.test(v),
    "Usa una ruta /… o una URL https.",
  );

/**
 * Lo que se guarda en perfil_organizacion.marca. Todo es opcional: lo que falte sale del
 * tema por defecto.
 */
export const esquemaMarcaGuardada = z.object({
  nombreComercial: z.string().trim().min(1).max(80).optional(),
  colores: z
    .object({
      fondo: color,
      primario: color,
      acento: color,
      brillo: color,
      secundario: color,
      lienzo: color,
    })
    .partial()
    .optional(),
  fuentes: z
    .object({ texto: z.enum(FUENTES_TEXTO), titulos: z.enum(FUENTES_TITULOS) })
    .partial()
    .optional(),
  logos: z.object({ completo: rutaLogo, isotipo: rutaLogo, logotipo: rutaLogo }).partial().optional(),
});

export type MarcaGuardada = z.infer<typeof esquemaMarcaGuardada>;

/** Completa una marca guardada con el tema por defecto. Un JSON inválido da el tema por defecto. */
export function completarMarca(guardada: unknown, base: Marca = MARCA_CODIGO_LENGUA): Marca {
  const leida = esquemaMarcaGuardada.safeParse(guardada ?? {});
  if (!leida.success) return base;
  const m = leida.data;
  return {
    nombreComercial: m.nombreComercial ?? base.nombreComercial,
    colores: { ...base.colores, ...m.colores },
    fuentes: { ...base.fuentes, ...m.fuentes },
    logos: { ...base.logos, ...m.logos },
  };
}

/** Variable CSS de cada fuente precargada (src/app/fuentes.ts). */
export const VARIABLE_FUENTE: Record<FuenteTexto | FuenteTitulos, string> = {
  Montserrat: "--fuente-montserrat",
  Poppins: "--fuente-poppins",
  Orbitron: "--fuente-orbitron",
  "Exo 2": "--fuente-exo-2",
};
