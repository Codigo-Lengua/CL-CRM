/** Fecha de calendario "AAAA-MM-DD": se compara como texto y no depende de la zona horaria. */
export type Dia = string;

export interface Vigencia {
  desde: Dia;
  /** Último día, inclusive. null = sin fecha de fin. */
  hasta: Dia | null;
}

export const esDia = (v: string): v is Dia => /^\d{4}-\d{2}-\d{2}$/.test(v);

export const diaDe = (fecha: Date): Dia => fecha.toISOString().slice(0, 10);

export function diaAnterior(dia: Dia): Dia {
  const fecha = new Date(`${dia}T00:00:00Z`);
  fecha.setUTCDate(fecha.getUTCDate() - 1);
  return diaDe(fecha);
}

export const cubre = (v: Vigencia, dia: Dia) => v.desde <= dia && (v.hasta === null || dia <= v.hasta);

export function seTraslapan(a: Vigencia, b: Vigencia): boolean {
  const finA = a.hasta ?? "9999-12-31";
  const finB = b.hasta ?? "9999-12-31";
  return a.desde <= finB && b.desde <= finA;
}
