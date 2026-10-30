import type { CSSProperties } from "react";
import { type Marca, VARIABLE_FUENTE } from "@/modules/marca/dominio/marca";
import { derivarTokens, type Modo, NOMBRES_TOKENS } from "@/modules/marca/dominio/tokens";

/** Variables del tema para aplicar una marca y un modo solo dentro de un elemento (vistas previas). */
export function variablesDeModo(marca: Marca, modo: Modo): CSSProperties {
  const tokens = derivarTokens(marca.colores, modo);
  const variables: Record<string, string> = {
    "--fuente-texto": `var(${VARIABLE_FUENTE[marca.fuentes.texto]})`,
    "--fuente-titulos": `var(${VARIABLE_FUENTE[marca.fuentes.titulos]})`,
  };
  for (const nombre of NOMBRES_TOKENS) variables[`--color-${nombre}`] = tokens[nombre];
  return variables as CSSProperties;
}
