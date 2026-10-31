import type { Etapa } from "./etapas";

export interface EstadoNegocio {
  etapaId: string;
  ganadoEn: Date | null;
  entregadoEn: Date | null;
  perdidoEn: Date | null;
  motivoPerdidaId: string | null;
}

export class ErrorMotivoPerdida extends Error {
  constructor(mensaje = "Elige el motivo de la pérdida.") {
    super(mensaje);
    this.name = "ErrorMotivoPerdida";
  }
}

/**
 * Lo que cambia en el negocio al entrar a `destino`: la etapa, desde cuándo y las fechas de
 * los hitos. RN-22: perder exige un motivo del diccionario. Reabrir borra la pérdida.
 * RN-26: la fecha de entrega es la que suma al contador de clientes asegurados.
 */
export function cambiosAlMover(
  negocio: EstadoNegocio,
  destino: Etapa,
  ahora: Date,
  motivoPerdidaId?: string | null,
): EstadoNegocio & { etapaDesde: Date } {
  const base = { ...negocio, etapaId: destino.id, etapaDesde: ahora };
  switch (destino.tipoSistema) {
    case "PERDIDA":
      if (!motivoPerdidaId) throw new ErrorMotivoPerdida();
      return { ...base, perdidoEn: ahora, motivoPerdidaId };
    case "GANADA":
      return { ...base, ganadoEn: negocio.ganadoEn ?? ahora, perdidoEn: null, motivoPerdidaId: null };
    case "ENTREGADA":
      return { ...base, entregadoEn: negocio.entregadoEn ?? ahora };
    case "ABIERTA":
      return { ...base, perdidoEn: null, motivoPerdidaId: null };
  }
}

/** Al reabrir un perdido vuelve a la última etapa abierta en que estuvo (CL-CRM-02 §10). */
export function etapaParaReabrir(
  historial: readonly { etapaDestinoId: string }[],
  etapas: readonly Etapa[],
): Etapa | undefined {
  const abiertas = new Map(
    etapas.filter((e) => e.activo && e.tipoSistema === "ABIERTA").map((e) => [e.id, e]),
  );
  for (let i = historial.length - 1; i >= 0; i--) {
    const etapa = abiertas.get(historial[i]!.etapaDestinoId);
    if (etapa) return etapa;
  }
  return [...abiertas.values()].sort((a, b) => a.orden - b.orden)[0];
}

export const estaAbierto = (etapa: Pick<Etapa, "tipoSistema">) => etapa.tipoSistema === "ABIERTA";
