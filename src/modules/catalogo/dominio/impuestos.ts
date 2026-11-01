import { cubre, type Dia } from "./vigencia";

export interface ImpuestoAplicable {
  codigo: string;
  nombre: string;
  tipo: "TRASLADADO" | "RETENIDO";
  porcentaje: number;
  incluidoEnPrecio: boolean;
  activo: boolean;
  desde: Dia;
  hasta: Dia | null;
}

export interface ImpuestoCalculado {
  codigo: string;
  nombre: string;
  tipo: "TRASLADADO" | "RETENIDO";
  porcentaje: number;
  valor: number;
}

export interface Desglose {
  base: number;
  impuestos: ImpuestoCalculado[];
  total: number;
}

/** Redondeo a centavos sin errores de coma flotante. */
export const redondear = (valor: number) => Math.round((valor + Number.EPSILON) * 100) / 100;

export const vigentes = (impuestos: readonly ImpuestoAplicable[], dia: Dia) =>
  impuestos.filter((i) => i.activo && cubre(i, dia));

/**
 * RN-30: impuestos de un ítem. Si el precio ya incluye un impuesto trasladado, se separa de la
 * base; los demás se calculan sobre la base. Los trasladados se suman y los retenidos se restan.
 * La base y los incluidos suman exactamente el precio: el residuo de redondeo queda en la base.
 */
export function calcularImpuestos(
  precio: number,
  impuestos: readonly ImpuestoAplicable[],
  dia: Dia,
): Desglose {
  const aplican = vigentes(impuestos, dia);
  const incluidos = aplican.filter((i) => i.tipo === "TRASLADADO" && i.incluidoEnPrecio);
  const tasaIncluida = incluidos.reduce((s, i) => s + i.porcentaje, 0);
  const baseExacta = precio / (1 + tasaIncluida / 100);

  const calculados = aplican.map((i) => ({
    codigo: i.codigo,
    nombre: i.nombre,
    tipo: i.tipo,
    porcentaje: i.porcentaje,
    valor: redondear((baseExacta * i.porcentaje) / 100),
  }));
  const valorIncluido = calculados
    .filter((c) => incluidos.some((i) => i.codigo === c.codigo))
    .reduce((s, c) => s + c.valor, 0);
  const base = redondear(precio - valorIncluido);
  const trasladados = calculados.filter((c) => c.tipo === "TRASLADADO").reduce((s, c) => s + c.valor, 0);
  const retenidos = calculados.filter((c) => c.tipo === "RETENIDO").reduce((s, c) => s + c.valor, 0);
  return { base, impuestos: calculados, total: redondear(base + trasladados - retenidos) };
}
