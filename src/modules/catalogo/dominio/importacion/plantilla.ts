import { type ClaveColumna, COLUMNAS, type Columna } from "./columnas";

type Valor = string | number | null;
type FilaEjemplo = Partial<Record<ClaveColumna, Valor>>;

export interface ParametrosPlantilla {
  /** Líneas de servicio de la organización; el ejemplo usa las suyas. */
  lineas: string[];
  /** Un impuesto trasladado de la organización, si tiene, para mostrar la columna en uso. */
  impuesto: string | null;
  hoy: string;
}

/**
 * Filas de ejemplo: un proyecto con dos costos, un mensual con dos planes y un servicio a cotizar.
 * Muestran las tres formas de usar la tabla: una fila por servicio, filas repetidas por plan y
 * filas repetidas por costo.
 */
export function filasDeEjemplo({ lineas, impuesto, hoy }: ParametrosPlantilla): FilaEjemplo[] {
  const linea = (i: number) => lineas[i] ?? lineas[0] ?? null;
  return [
    {
      codigo: "WEB-LANDING",
      nombre: "Landing page",
      linea: linea(0),
      tipo: "Proyecto",
      precio: 1800000,
      desde: hoy,
      incluye: "Diseño, desarrollo y publicación de una página con formulario de contacto.",
      entregaDias: 15,
      horas: 30,
      visibleWeb: "Sí",
      cotizacionManual: "No",
      impuestos: impuesto,
      costoConcepto: "Dominio y hosting",
      costoValor: 350000,
      costoPeriodicidad: "Anual",
    },
    {
      codigo: "WEB-LANDING",
      costoConcepto: "Plantilla premium",
      costoValor: 120000,
      costoPeriodicidad: "Único",
    },
    {
      codigo: "BOT-WA",
      nombre: "Bot de WhatsApp",
      linea: linea(4),
      tipo: "Mensual",
      plan: "Básico",
      limiteUso: 1000,
      precio: 450000,
      desde: hoy,
      incluye: "Respuestas automáticas, menú y paso a un asesor.",
      entregaDias: 10,
      visibleWeb: "Sí",
      impuestos: impuesto,
      costoConcepto: "API de WhatsApp",
      costoValor: 80000,
      costoPeriodicidad: "Mensual",
    },
    { codigo: "BOT-WA", plan: "Pro", limiteUso: 5000, precio: 850000, desde: hoy },
    {
      codigo: "MARCA-360",
      nombre: "Identidad de marca",
      linea: linea(3),
      tipo: "Proyecto",
      incluye: "Logo, paleta, tipografías y manual de marca.",
      entregaDias: 20,
      visibleWeb: "Sí",
      cotizacionManual: "Sí",
    },
  ];
}

export function columnasDe(formato: "completo" | "pdf"): readonly Columna[] {
  return formato === "pdf" ? COLUMNAS.filter((c) => c.enPdf) : COLUMNAS;
}

export function tablaDeEjemplo(parametros: ParametrosPlantilla, formato: "completo" | "pdf" = "completo") {
  const columnas = columnasDe(formato);
  return [
    columnas.map((c) => c.encabezado),
    ...filasDeEjemplo(parametros).map((f) => columnas.map((c) => f[c.clave] ?? null)),
  ];
}
