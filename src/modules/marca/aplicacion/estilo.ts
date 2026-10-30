import { type Marca, VARIABLE_FUENTE } from "../dominio/marca";
import { derivarTokens, variablesCss } from "../dominio/tokens";

/**
 * CSS que aplica una marca sobre el tema por defecto. Solo usa colores ya validados como
 * #RRGGBB y fuentes de la lista cerrada, así que no puede inyectar otra cosa.
 */
export function cssDeMarca(marca: Marca): string {
  const fuentes = `--fuente-texto:var(${VARIABLE_FUENTE[marca.fuentes.texto]});--fuente-titulos:var(${VARIABLE_FUENTE[marca.fuentes.titulos]});`;
  return (
    `:root{${variablesCss(derivarTokens(marca.colores, "oscuro"))}${fuentes}}` +
    `:root[data-tema="claro"]{${variablesCss(derivarTokens(marca.colores, "claro"))}}`
  );
}
