/** Valor en la moneda de la organización, sin decimales. */
export function formatoMoneda(valor: unknown, moneda: string): string {
  if (valor === null || valor === undefined) return "—";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(Number(valor));
}

export const fechaCorta = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" });

/** "hoy", "1 día", "12 días". */
export function diasDesde(fecha: Date, ahora = new Date()): string {
  const dias = Math.floor((ahora.getTime() - fecha.getTime()) / 86_400_000);
  return dias <= 0 ? "hoy" : dias === 1 ? "1 día" : `${dias} días`;
}
