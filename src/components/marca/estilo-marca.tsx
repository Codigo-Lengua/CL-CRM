import { cssDeMarca } from "@/modules/marca/aplicacion/estilo";
import type { Marca } from "@/modules/marca/dominio/marca";

/** Aplica la marca de la organización sin recompilar: reemplaza los tokens del tema. */
export function EstiloMarca({ marca }: { marca: Marca }) {
  return <style>{cssDeMarca(marca)}</style>;
}
