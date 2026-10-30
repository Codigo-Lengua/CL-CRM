/** Contraste WCAG 2.1 entre dos colores #RRGGBB. Sin dependencias. */

export type Hex = `#${string}`;

const HEX = /^#[0-9a-fA-F]{6}$/;

export function esHex(valor: string): valor is Hex {
  return HEX.test(valor);
}

function canal(valor: number): number {
  const c = valor / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

export function aRgb(hex: Hex): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function aHex([r, g, b]: [number, number, number]): Hex {
  const limitar = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `#${[r, g, b].map((v) => limitar(v).toString(16).padStart(2, "0")).join("")}`;
}

export function luminancia(hex: Hex): number {
  const [r, g, b] = aRgb(hex).map(canal) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Razón de contraste entre 1 y 21. */
export function contraste(a: Hex, b: Hex): number {
  const [claro, oscuro] = [luminancia(a), luminancia(b)].sort((x, y) => y - x) as [number, number];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Mezcla `a` con `b` en la proporción `peso` (0 = solo a, 1 = solo b). */
export function mezclar(a: Hex, b: Hex, peso: number): Hex {
  const [ra, ga, ba] = aRgb(a);
  const [rb, gb, bb] = aRgb(b);
  return aHex([ra + (rb - ra) * peso, ga + (gb - ga) * peso, ba + (bb - ba) * peso]);
}

/** AA para texto normal (WCAG 1.4.3). */
export const CONTRASTE_MINIMO_TEXTO = 4.5;
/** AA para bordes de controles y elementos gráficos (WCAG 1.4.11). */
export const CONTRASTE_MINIMO_GRAFICO = 3;
