export type TipoEtapa = "ABIERTA" | "GANADA" | "ENTREGADA" | "PERDIDA";

export interface Etapa {
  id: string;
  nombre: string;
  orden: number;
  tipoSistema: TipoEtapa;
  limiteAsesor: boolean;
  probabilidad: number;
  activo: boolean;
}

export interface EtapaPlantilla extends Omit<Etapa, "id" | "activo"> {
  codigo: string;
}

/** Embudo por defecto de CÓDIGO LENGUA (CL-CRM-02 §10). Entregado es "cliente asegurado". */
export const ETAPAS_POR_DEFECTO: readonly EtapaPlantilla[] = (
  [
    { codigo: "PROSPECTO", nombre: "Prospecto", tipoSistema: "ABIERTA", probabilidad: 5 },
    { codigo: "CONTACTADO", nombre: "Contactado", tipoSistema: "ABIERTA", probabilidad: 10 },
    { codigo: "INTERESADO", nombre: "Interesado", tipoSistema: "ABIERTA", probabilidad: 25 },
    { codigo: "DEMO_AGENDADA", nombre: "Demo agendada", tipoSistema: "ABIERTA", probabilidad: 40 },
    { codigo: "DEMO_REALIZADA", nombre: "Demo realizada", tipoSistema: "ABIERTA", probabilidad: 55 },
    {
      codigo: "PROPUESTA_ENVIADA",
      nombre: "Propuesta enviada",
      tipoSistema: "ABIERTA",
      probabilidad: 70,
      limiteAsesor: true,
    },
    { codigo: "GANADO", nombre: "Ganado", tipoSistema: "GANADA", probabilidad: 100 },
    { codigo: "ENTREGADO", nombre: "Entregado", tipoSistema: "ENTREGADA", probabilidad: 100 },
    { codigo: "PERDIDO", nombre: "Perdido", tipoSistema: "PERDIDA", probabilidad: 0 },
  ] satisfies (Omit<EtapaPlantilla, "orden" | "limiteAsesor"> & { limiteAsesor?: boolean })[]
).map((e, i) => ({ limiteAsesor: false, ...e, orden: (i + 1) * 10 }));

export const NOMBRE_TIPO: Record<TipoEtapa, string> = {
  ABIERTA: "Abierta",
  GANADA: "Ganada",
  ENTREGADA: "Entregada",
  PERDIDA: "Perdida",
};

export const ordenar = <T extends Pick<Etapa, "orden">>(etapas: readonly T[]): T[] =>
  [...etapas].sort((a, b) => a.orden - b.orden);

/**
 * Un embudo es válido si las reglas pueden funcionar con él: al menos una etapa abierta,
 * una de cada tipo de cierre y exactamente un límite del asesor, que debe ser abierta.
 * Devuelve el primer problema o null.
 */
export function problemaDelEmbudo(etapas: readonly Etapa[]): string | null {
  const activas = etapas.filter((e) => e.activo);
  if (!activas.some((e) => e.tipoSistema === "ABIERTA")) return "Debe quedar al menos una etapa abierta.";
  for (const tipo of ["GANADA", "ENTREGADA", "PERDIDA"] as const) {
    const n = activas.filter((e) => e.tipoSistema === tipo).length;
    if (n !== 1) return `Debe haber exactamente una etapa ${NOMBRE_TIPO[tipo].toLowerCase()} activa.`;
  }
  const limites = activas.filter((e) => e.limiteAsesor);
  if (limites.length !== 1) return "Marca una sola etapa como límite del asesor.";
  if (limites[0]!.tipoSistema !== "ABIERTA") return "El límite del asesor debe ser una etapa abierta.";
  if (etapas.some((e) => e.probabilidad < 0 || e.probabilidad > 100)) return "La probabilidad va de 0 a 100.";
  return null;
}

/** Primera etapa abierta: donde nace un negocio (D-14). */
export function etapaInicial(etapas: readonly Etapa[]): Etapa | undefined {
  return ordenar(etapas).find((e) => e.activo && e.tipoSistema === "ABIERTA");
}
