import type { Etapa } from "./etapas";

export type Decision = { permitido: true } | { permitido: false; motivo: string };

/** Quién mueve: alcance de negocios.mover y si es el dueño del negocio. */
export interface QuienMueve {
  alcance: "todos" | "asignados";
  esDueno: boolean;
}

export interface Condiciones {
  /** RN-23: para pasar a Ganado debe existir una cotización aceptada. */
  cotizacionAceptada: boolean;
}

const no = (motivo: string): Decision => ({ permitido: false, motivo });

/**
 * RN-21: el asesor mueve sus negocios entre etapas abiertas hasta la marcada como límite y
 * puede darlos por perdidos. Administración y socios mueven todo, salvo Ganado o Entregado a
 * Perdido, que solo ocurre con una devolución total aprobada (RN-24).
 */
export function puedeMover(
  quien: QuienMueve,
  origen: Etapa,
  destino: Etapa,
  etapas: readonly Etapa[],
  condiciones: Condiciones,
): Decision {
  if (origen.id === destino.id) return no("El negocio ya está en esa etapa.");
  if (!destino.activo) return no("Esa etapa está desactivada.");

  const cerrado = origen.tipoSistema === "GANADA" || origen.tipoSistema === "ENTREGADA";
  if (cerrado && destino.tipoSistema === "PERDIDA") {
    return no("Un negocio ganado solo pasa a perdido con una devolución total aprobada.");
  }

  if (quien.alcance === "asignados") {
    if (!quien.esDueno) return no("Solo puedes mover tus negocios.");
    if (origen.tipoSistema !== "ABIERTA")
      return no("Solo administración o socios mueven un negocio cerrado.");
    if (destino.tipoSistema === "PERDIDA") return { permitido: true };
    if (destino.tipoSistema !== "ABIERTA") return no("Solo administración o socios cierran un negocio.");
    const limite = etapas.find((e) => e.activo && e.limiteAsesor);
    if (limite && destino.orden > limite.orden) return no(`Puedes llegar hasta «${limite.nombre}».`);
    return { permitido: true };
  }

  if (origen.tipoSistema === "PERDIDA" && destino.tipoSistema !== "ABIERTA") {
    return no("Un negocio perdido se reabre en una etapa abierta.");
  }
  if (destino.tipoSistema === "GANADA" && !condiciones.cotizacionAceptada) {
    return no("Para pasar a ganado debe existir una cotización aceptada.");
  }
  if (destino.tipoSistema === "ENTREGADA" && origen.tipoSistema !== "GANADA") {
    return no("Solo un negocio ganado pasa a entregado.");
  }
  return { permitido: true };
}
