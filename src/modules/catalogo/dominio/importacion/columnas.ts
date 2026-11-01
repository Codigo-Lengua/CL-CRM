/**
 * Formato de la plantilla del catálogo. Es la única fuente: de aquí salen los encabezados de la
 * plantilla en Excel, CSV y PDF, la hoja de instrucciones y el lector que interpreta el archivo.
 * Cambiar una columna aquí cambia todo el flujo a la vez.
 */
export type ClaveColumna =
  | "codigo"
  | "nombre"
  | "linea"
  | "tipo"
  | "plan"
  | "limiteUso"
  | "precio"
  | "desde"
  | "hasta"
  | "incluye"
  | "entregaDias"
  | "horas"
  | "visibleWeb"
  | "cotizacionManual"
  | "impuestos"
  | "costoConcepto"
  | "costoValor"
  | "costoPeriodicidad";

export interface Columna {
  clave: ClaveColumna;
  encabezado: string;
  /** Otros nombres que se aceptan en el encabezado, por si el archivo no viene de la plantilla. */
  alias?: string[];
  ayuda: string;
  /** Va en el PDF de ejemplo; el resto de columnas son opcionales y solo caben en Excel y CSV. */
  enPdf?: boolean;
}

export const COLUMNAS: readonly Columna[] = [
  {
    clave: "codigo",
    encabezado: "Código",
    alias: ["sku", "referencia"],
    ayuda:
      "Obligatorio. Identifica el servicio; si ya existe, se actualiza. Repite el código en otra fila para agregar planes, precios o costos.",
    enPdf: true,
  },
  {
    clave: "nombre",
    encabezado: "Nombre",
    alias: ["servicio"],
    ayuda: "Obligatorio para servicios nuevos.",
    enPdf: true,
  },
  {
    clave: "linea",
    encabezado: "Línea",
    alias: ["linea de servicio", "categoria"],
    ayuda: "Línea de servicio por su nombre o código. Si no existe, se crea.",
    enPdf: true,
  },
  {
    clave: "tipo",
    encabezado: "Tipo",
    ayuda: "Proyecto o Mensual. Obligatorio para servicios nuevos.",
    enPdf: true,
  },
  {
    clave: "plan",
    encabezado: "Plan",
    ayuda: "Solo servicios mensuales. Si el servicio tiene planes, cada precio va con su plan.",
    enPdf: true,
  },
  {
    clave: "limiteUso",
    encabezado: "Límite de uso",
    ayuda: "Número entero del plan, por ejemplo conversaciones al mes.",
  },
  {
    clave: "precio",
    encabezado: "Precio",
    alias: ["valor", "precio de venta"],
    ayuda: "Antes de impuestos trasladados, salvo que el impuesto diga que va incluido. Ejemplo: 1.800.000",
    enPdf: true,
  },
  {
    clave: "desde",
    encabezado: "Vigente desde",
    alias: ["desde", "fecha"],
    ayuda: "AAAA-MM-DD o DD/MM/AAAA. Si se deja vacía, hoy. El precio anterior se cierra el día antes.",
    enPdf: true,
  },
  {
    clave: "hasta",
    encabezado: "Vigente hasta",
    alias: ["hasta"],
    ayuda: "Opcional. Último día del precio.",
  },
  { clave: "incluye", encabezado: "Incluye", alias: ["descripcion"], ayuda: "Qué recibe el cliente." },
  {
    clave: "entregaDias",
    encabezado: "Días de entrega",
    alias: ["entrega", "dias"],
    ayuda: "Número entero.",
    enPdf: true,
  },
  { clave: "horas", encabezado: "Horas", ayuda: "Horas de trabajo estimadas, número entero." },
  { clave: "visibleWeb", encabezado: "Visible en web", alias: ["web"], ayuda: "Sí o No. Por omisión, Sí." },
  {
    clave: "cotizacionManual",
    encabezado: "Cotización manual",
    alias: ["a cotizar"],
    ayuda: "Sí cuando el precio depende de cada cliente. Por omisión, No.",
    enPdf: true,
  },
  {
    clave: "impuestos",
    encabezado: "Impuestos",
    ayuda: "Códigos de impuestos ya creados, separados por coma. Se suman a los que el servicio ya tenga.",
  },
  {
    clave: "costoConcepto",
    encabezado: "Costo de terceros",
    alias: ["costo", "concepto del costo"],
    ayuda: "Lo que se le paga a un tercero, por ejemplo hosting. Si ya existe con ese nombre, se actualiza.",
    enPdf: true,
  },
  {
    clave: "costoValor",
    encabezado: "Valor del costo",
    alias: ["valor costo"],
    ayuda: "Obligatorio si hay costo.",
    enPdf: true,
  },
  {
    clave: "costoPeriodicidad",
    encabezado: "Periodicidad del costo",
    alias: ["periodicidad"],
    ayuda: "Único, Mensual o Anual. Por omisión, Único.",
    enPdf: true,
  },
];

/** "Días de entrega" → "diasdeentrega": sin tildes, mayúsculas, espacios ni signos. */
export function normalizar(texto: string): string {
  return texto
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const PORENCABEZADO = new Map<string, ClaveColumna>(
  COLUMNAS.flatMap((c) => [c.encabezado, ...(c.alias ?? [])].map((n) => [normalizar(n), c.clave] as const)),
);

export function claveDeEncabezado(texto: string): ClaveColumna | null {
  return PORENCABEZADO.get(normalizar(texto)) ?? null;
}
