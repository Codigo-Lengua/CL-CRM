import { cubre, type Dia, diaAnterior, seTraslapan, type Vigencia } from "./vigencia";

export interface PrecioConVigencia extends Vigencia {
  id: string;
  valor: number;
}

/** RN-27: el precio cuya vigencia cubre el día de la cotización. */
export function precioVigente<P extends PrecioConVigencia>(precios: readonly P[], dia: Dia): P | null {
  return precios.find((p) => cubre(p, dia)) ?? null;
}

export class ErrorVigencia extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorVigencia";
  }
}

/**
 * RN-27: un precio nuevo nunca sobrescribe a otro. Si el vigente no tiene fin y empezó antes,
 * se cierra el día anterior al nuevo; cualquier otro traslape se rechaza.
 * Devuelve el precio que hay que cerrar, si lo hay.
 */
export function planearNuevoPrecio(
  existentes: readonly PrecioConVigencia[],
  nuevo: Vigencia,
): { cerrar: { id: string; hasta: Dia } | null } {
  if (nuevo.hasta !== null && nuevo.hasta < nuevo.desde) {
    throw new ErrorVigencia("La fecha final no puede ser anterior a la inicial.");
  }
  let cerrar: { id: string; hasta: Dia } | null = null;
  for (const p of existentes) {
    const abiertoAntes = p.hasta === null && p.desde < nuevo.desde;
    const vigencia = abiertoAntes ? { ...p, hasta: diaAnterior(nuevo.desde) } : p;
    if (seTraslapan(vigencia, nuevo)) {
      throw new ErrorVigencia(
        `Se cruza con el precio vigente desde ${p.desde}${p.hasta ? ` hasta ${p.hasta}` : ""}.`,
      );
    }
    if (abiertoAntes) cerrar = { id: p.id, hasta: vigencia.hasta! };
  }
  return { cerrar };
}
