import { contraste, CONTRASTE_MINIMO_GRAFICO, CONTRASTE_MINIMO_TEXTO, type Hex, mezclar } from "./contraste";
import type { ColoresMarca, Marca } from "./marca";

export type Modo = "oscuro" | "claro";

/**
 * Tokens semánticos: lo único que usan los componentes (clases bg-superficie,
 * text-texto, border-borde…). Nunca un hex ni un color de Tailwind.
 */
export interface Tokens {
  fondo: Hex;
  superficie: Hex;
  "superficie-alta": Hex;
  borde: Hex;
  "borde-control": Hex;
  texto: Hex;
  "texto-suave": Hex;
  primario: Hex;
  "primario-hover": Hex;
  "sobre-primario": Hex;
  enlace: Hex;
  foco: Hex;
  brillo: Hex;
  peligro: Hex;
  "peligro-fondo": Hex;
  exito: Hex;
  "exito-fondo": Hex;
  aviso: Hex;
  "aviso-fondo": Hex;
}

export const NOMBRES_TOKENS = [
  "fondo",
  "superficie",
  "superficie-alta",
  "borde",
  "borde-control",
  "texto",
  "texto-suave",
  "primario",
  "primario-hover",
  "sobre-primario",
  "enlace",
  "foco",
  "brillo",
  "peligro",
  "peligro-fondo",
  "exito",
  "exito-fondo",
  "aviso",
  "aviso-fondo",
] as const satisfies readonly (keyof Tokens)[];

/** Colores de estado: no son de la marca, pero se ajustan al fondo de cada modo. */
const ESTADOS: Record<Modo, { peligro: Hex; exito: Hex; aviso: Hex }> = {
  oscuro: { peligro: "#F87171", exito: "#4ADE80", aviso: "#FBBF24" },
  claro: { peligro: "#B91C1C", exito: "#15803D", aviso: "#A16207" },
};

/** Mueve `color` hacia `hacia` hasta lograr el contraste pedido contra `fondo`. */
function ajustar(color: Hex, fondo: Hex, hacia: Hex, minimo: number): Hex {
  for (let paso = 0; paso <= 20; paso++) {
    const candidato = mezclar(color, hacia, paso / 20);
    if (contraste(candidato, fondo) >= minimo) return candidato;
  }
  return hacia;
}

function mejorTextoSobre(fondo: Hex, opciones: Hex[]): Hex {
  return opciones.reduce((mejor, c) => (contraste(c, fondo) > contraste(mejor, fondo) ? c : mejor));
}

export function derivarTokens(colores: ColoresMarca, modo: Modo): Tokens {
  const { fondo: noche, lienzo, primario, acento, brillo, secundario } = colores;
  const oscuro = modo === "oscuro";
  const fondo = oscuro ? noche : lienzo;
  const texto = oscuro ? lienzo : noche;
  const blanco: Hex = "#FFFFFF";

  const superficie = oscuro ? mezclar(noche, secundario, 0.18) : mezclar(lienzo, blanco, 0.7);
  const superficieAlta = oscuro ? mezclar(noche, secundario, 0.35) : mezclar(lienzo, secundario, 0.08);
  // En modo claro el primario se oscurece si hace falta para que sus textos y enlaces se lean.
  const primarioModo = oscuro ? primario : ajustar(acento, lienzo, noche, CONTRASTE_MINIMO_TEXTO);
  const estados = ESTADOS[modo];

  return {
    fondo,
    superficie,
    "superficie-alta": superficieAlta,
    borde: oscuro ? mezclar(noche, brillo, 0.22) : mezclar(lienzo, secundario, 0.2),
    "borde-control": ajustar(
      oscuro ? mezclar(noche, brillo, 0.4) : mezclar(lienzo, secundario, 0.45),
      superficie,
      texto,
      CONTRASTE_MINIMO_GRAFICO,
    ),
    texto,
    "texto-suave": ajustar(mezclar(texto, fondo, 0.3), superficie, texto, CONTRASTE_MINIMO_TEXTO),
    primario: primarioModo,
    "primario-hover": oscuro ? acento : mezclar(primarioModo, noche, 0.2),
    "sobre-primario": mejorTextoSobre(primarioModo, [noche, lienzo, blanco]),
    enlace: oscuro ? ajustar(brillo, superficie, lienzo, CONTRASTE_MINIMO_TEXTO) : primarioModo,
    foco: oscuro ? brillo : primarioModo,
    brillo,
    peligro: estados.peligro,
    "peligro-fondo": mezclar(fondo, estados.peligro, 0.12),
    exito: estados.exito,
    "exito-fondo": mezclar(fondo, estados.exito, 0.12),
    aviso: estados.aviso,
    "aviso-fondo": mezclar(fondo, estados.aviso, 0.12),
  };
}

/** Pares texto/fondo que deben cumplir WCAG AA en cada modo. */
const PARES: { texto: keyof Tokens; fondo: keyof Tokens; minimo: number; nombre: string }[] = [
  { texto: "texto", fondo: "fondo", minimo: CONTRASTE_MINIMO_TEXTO, nombre: "el texto sobre el fondo" },
  {
    texto: "texto",
    fondo: "superficie-alta",
    minimo: CONTRASTE_MINIMO_TEXTO,
    nombre: "el texto sobre las tarjetas",
  },
  {
    texto: "texto-suave",
    fondo: "superficie",
    minimo: CONTRASTE_MINIMO_TEXTO,
    nombre: "el texto secundario",
  },
  {
    texto: "sobre-primario",
    fondo: "primario",
    minimo: CONTRASTE_MINIMO_TEXTO,
    nombre: "el texto de los botones principales",
  },
  { texto: "enlace", fondo: "fondo", minimo: CONTRASTE_MINIMO_TEXTO, nombre: "los enlaces" },
  {
    texto: "peligro",
    fondo: "peligro-fondo",
    minimo: CONTRASTE_MINIMO_TEXTO,
    nombre: "los mensajes de error",
  },
  {
    texto: "borde-control",
    fondo: "superficie",
    minimo: CONTRASTE_MINIMO_GRAFICO,
    nombre: "el borde de los campos",
  },
  { texto: "foco", fondo: "fondo", minimo: CONTRASTE_MINIMO_GRAFICO, nombre: "el indicador de foco" },
];

export interface ProblemaContraste {
  modo: Modo;
  nombre: string;
  contraste: number;
  minimo: number;
}

/** Devuelve los pares que no cumplen AA. Una marca con problemas no se guarda. */
export function revisarContraste(marca: Pick<Marca, "colores">): ProblemaContraste[] {
  return (["oscuro", "claro"] as const).flatMap((modo) => {
    const tokens = derivarTokens(marca.colores, modo);
    return PARES.flatMap(({ texto, fondo, minimo, nombre }) => {
      const valor = contraste(tokens[texto], tokens[fondo]);
      return valor >= minimo ? [] : [{ modo, nombre, contraste: Math.round(valor * 100) / 100, minimo }];
    });
  });
}

/** Declaraciones CSS de un modo, por ejemplo `--color-fondo:#0F1324;`. */
export function variablesCss(tokens: Tokens): string {
  return NOMBRES_TOKENS.map((nombre) => `--color-${nombre}:${tokens[nombre]};`).join("");
}
