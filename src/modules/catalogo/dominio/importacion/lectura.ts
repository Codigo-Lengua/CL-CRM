import { type Dia, diaDe, esDia } from "../vigencia";
import { type ClaveColumna, claveDeEncabezado } from "./columnas";

/** Lo que trae una celda de Excel, CSV o PDF, sin interpretar. */
export type Celda = string | number | boolean | Date | null | undefined;

export type Tipo = "PROYECTO" | "MENSUAL";
export type Periodicidad = "UNICO" | "MENSUAL" | "ANUAL";

export interface PrecioLeido {
  fila: number;
  plan: string | null;
  valor: number;
  desde: Dia;
  hasta: Dia | null;
}

export interface CostoLeido {
  fila: number;
  concepto: string;
  valor: number;
  periodicidad: Periodicidad;
}

/** Un servicio del archivo. Un campo `undefined` no vino en el archivo y no se toca al actualizar. */
export interface ServicioLeido {
  fila: number;
  codigo: string;
  nombre?: string;
  linea?: string;
  tipo?: Tipo;
  incluye?: string;
  entregaDias?: number;
  horas?: number;
  visibleWeb?: boolean;
  requiereCotizacionManual?: boolean;
  impuestos: string[];
  planes: { nombre: string; limiteUso?: number }[];
  precios: PrecioLeido[];
  costos: CostoLeido[];
}

export interface Problema {
  /** Fila del archivo, contando el encabezado. null cuando es del archivo entero. */
  fila: number | null;
  codigo?: string;
  mensaje: string;
}

export interface Lectura {
  servicios: ServicioLeido[];
  errores: Problema[];
  filas: number;
}

export const MAXIMO_FILAS = 2000;

class ErrorCelda extends Error {}

const texto = (v: Celda): string => {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return diaDe(v);
  return String(v).trim();
};

/**
 * "1.800.000", "$ 1.800.000", "1800000,50", "1,800,000.50" o un número de Excel.
 * Con un solo separador seguido de 1 o 2 dígitos, ese separador es el decimal.
 */
export function aNumero(v: Celda): number {
  if (typeof v === "number") return v;
  let t = texto(v).replace(/[^\d,.-]/g, "");
  if (!t) return Number.NaN;
  const ultimoPunto = t.lastIndexOf(".");
  const ultimaComa = t.lastIndexOf(",");
  const decimal = Math.max(ultimoPunto, ultimaComa);
  const separadores = (t.match(/[.,]/g) ?? []).length;
  const digitosFinales = decimal >= 0 ? t.length - decimal - 1 : 0;
  const esDecimal =
    decimal >= 0 &&
    digitosFinales > 0 &&
    digitosFinales <= 2 &&
    (separadores === 1 || (ultimoPunto >= 0 && ultimaComa >= 0));
  if (esDecimal) {
    t = `${t.slice(0, decimal).replace(/[.,]/g, "")}.${t.slice(decimal + 1)}`;
  } else {
    t = t.replace(/[.,]/g, "");
  }
  return Number(t);
}

function dinero(v: Celda, que: string): number {
  const n = aNumero(v);
  if (!Number.isFinite(n)) throw new ErrorCelda(`${que} no es un número: "${texto(v)}".`);
  if (n < 0) throw new ErrorCelda(`${que} no puede ser negativo.`);
  return Math.round(n * 100) / 100;
}

function entero(v: Celda, que: string): number | undefined {
  if (texto(v) === "") return undefined;
  const n = aNumero(v);
  if (!Number.isInteger(n) || n < 0) throw new ErrorCelda(`${que} debe ser un número entero: "${texto(v)}".`);
  return n;
}

/** AAAA-MM-DD, DD/MM/AAAA, DD-MM-AAAA o una fecha de Excel. */
export function aDia(v: Celda): Dia | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : diaDe(v);
  const t = texto(v);
  if (!t) return null;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const latina = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/.exec(t);
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : latina ? [latina[3], latina[2], latina[1]] : [];
  if (!a) return null;
  const dia = `${a}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  if (!esDia(dia) || diaDe(new Date(`${dia}T00:00:00Z`)) !== dia) return null;
  return dia;
}

function fecha(v: Celda, que: string): Dia | null {
  if (texto(v) === "") return null;
  const dia = aDia(v);
  if (!dia) throw new ErrorCelda(`${que} no es una fecha válida: "${texto(v)}". Usa AAAA-MM-DD.`);
  return dia;
}

const SI = new Set(["si", "sí", "s", "x", "true", "verdadero", "1", "yes"]);
const NO = new Set(["no", "n", "false", "falso", "0"]);

function siNo(v: Celda, que: string): boolean | undefined {
  if (typeof v === "boolean") return v;
  const t = texto(v).toLowerCase();
  if (!t) return undefined;
  if (SI.has(t)) return true;
  if (NO.has(t)) return false;
  throw new ErrorCelda(`${que} debe ser Sí o No: "${texto(v)}".`);
}

function tipo(v: Celda): Tipo | undefined {
  const t = texto(v).toLowerCase();
  if (!t) return undefined;
  if (t.startsWith("proyecto") || t === "unico" || t === "único") return "PROYECTO";
  if (t.startsWith("mensual") || t === "recurrente") return "MENSUAL";
  throw new ErrorCelda(`El tipo debe ser Proyecto o Mensual: "${texto(v)}".`);
}

function periodicidad(v: Celda): Periodicidad {
  const t = texto(v)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
  if (!t || t === "unico" || t === "unica" || t === "una vez") return "UNICO";
  if (t.startsWith("mensual")) return "MENSUAL";
  if (t.startsWith("anual")) return "ANUAL";
  throw new ErrorCelda(`La periodicidad del costo debe ser Único, Mensual o Anual: "${texto(v)}".`);
}

/** Busca el encabezado en las primeras filas: un archivo puede traer un título antes de la tabla. */
function ubicarEncabezado(filas: readonly Celda[][]) {
  for (let i = 0; i < Math.min(filas.length, 15); i++) {
    const columnas = new Map<ClaveColumna, number>();
    filas[i]!.forEach((celda, indice) => {
      const clave = claveDeEncabezado(texto(celda));
      if (clave && !columnas.has(clave)) columnas.set(clave, indice);
    });
    if (columnas.has("codigo") && (columnas.has("nombre") || columnas.has("precio")))
      return { indice: i, columnas };
  }
  return null;
}

/** Asigna un valor de servicio; si dos filas del mismo código dicen cosas distintas, es un error. */
function fijar<K extends keyof ServicioLeido>(
  s: ServicioLeido,
  campo: K,
  valor: ServicioLeido[K],
  que: string,
) {
  if (valor === undefined) return;
  if (s[campo] !== undefined && s[campo] !== valor)
    throw new ErrorCelda(
      `${que} no coincide con la fila ${s.fila}: "${String(s[campo])}" y "${String(valor)}".`,
    );
  s[campo] = valor;
}

/**
 * Convierte la tabla del archivo en servicios. Es pura: no consulta la base de datos, así que solo
 * valida el formato. Lo que depende de la organización (líneas, impuestos, traslapes) lo revisa el
 * plan de importación.
 */
export function leerCatalogo(filas: readonly Celda[][], hoy: Dia): Lectura {
  const errores: Problema[] = [];
  const encabezado = ubicarEncabezado(filas);
  if (!encabezado) {
    return {
      servicios: [],
      filas: 0,
      errores: [
        {
          fila: null,
          mensaje:
            "No encontré el encabezado de la tabla. La primera fila debe tener al menos las columnas Código y Nombre, como en la plantilla.",
        },
      ],
    };
  }
  const datos = filas.slice(encabezado.indice + 1);
  if (datos.length > MAXIMO_FILAS) {
    return {
      servicios: [],
      filas: datos.length,
      errores: [
        { fila: null, mensaje: `El archivo tiene ${datos.length} filas; el máximo es ${MAXIMO_FILAS}.` },
      ],
    };
  }

  const porCodigo = new Map<string, ServicioLeido>();
  let leidas = 0;
  datos.forEach((celdas, i) => {
    const fila = encabezado.indice + i + 2;
    const v = (clave: ClaveColumna): Celda => {
      const indice = encabezado.columnas.get(clave);
      return indice === undefined ? undefined : celdas[indice];
    };
    if (celdas.every((c) => texto(c) === "")) return;
    leidas++;
    const codigo = texto(v("codigo")).toUpperCase();
    try {
      if (!codigo) throw new ErrorCelda("Falta el código del servicio.");
      if (!/^[A-Z0-9_-]{2,40}$/.test(codigo))
        throw new ErrorCelda(
          `El código "${codigo}" solo admite letras, números, guion y guion bajo (2 a 40).`,
        );
      let s = porCodigo.get(codigo);
      if (!s) {
        s = { fila, codigo, impuestos: [], planes: [], precios: [], costos: [] };
        porCodigo.set(codigo, s);
      }
      const nombre = texto(v("nombre"));
      if (nombre.length > 120) throw new ErrorCelda("El nombre admite máximo 120 caracteres.");
      fijar(s, "nombre", nombre || undefined, "El nombre");
      fijar(s, "linea", texto(v("linea")) || undefined, "La línea");
      fijar(s, "tipo", tipo(v("tipo")), "El tipo");
      const incluye = texto(v("incluye"));
      if (incluye.length > 4000) throw new ErrorCelda("Incluye admite máximo 4000 caracteres.");
      fijar(s, "incluye", incluye || undefined, "Incluye");
      fijar(s, "entregaDias", entero(v("entregaDias"), "Los días de entrega"), "Los días de entrega");
      fijar(s, "horas", entero(v("horas"), "Las horas"), "Las horas");
      fijar(s, "visibleWeb", siNo(v("visibleWeb"), "Visible en web"), "Visible en web");
      fijar(
        s,
        "requiereCotizacionManual",
        siNo(v("cotizacionManual"), "Cotización manual"),
        "Cotización manual",
      );
      for (const codigoImpuesto of texto(v("impuestos"))
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter(Boolean))
        if (!s.impuestos.includes(codigoImpuesto)) s.impuestos.push(codigoImpuesto);

      const plan = texto(v("plan")) || null;
      if (plan && plan.length > 60) throw new ErrorCelda("El nombre del plan admite máximo 60 caracteres.");
      const limiteUso = entero(v("limiteUso"), "El límite de uso");
      if (plan) {
        const existente = s.planes.find((p) => p.nombre.toLowerCase() === plan.toLowerCase());
        if (!existente) s.planes.push({ nombre: plan, limiteUso });
        else if (limiteUso !== undefined) {
          if (existente.limiteUso !== undefined && existente.limiteUso !== limiteUso)
            throw new ErrorCelda(`El plan ${plan} tiene dos límites de uso distintos.`);
          existente.limiteUso = limiteUso;
        }
      } else if (limiteUso !== undefined) throw new ErrorCelda("El límite de uso va con un plan.");

      if (texto(v("precio")) !== "") {
        const desde = fecha(v("desde"), "Vigente desde") ?? hoy;
        const hasta = fecha(v("hasta"), "Vigente hasta");
        if (hasta && hasta < desde) throw new ErrorCelda("Vigente hasta es anterior a vigente desde.");
        const repetido = s.precios.find(
          (p) => (p.plan ?? "").toLowerCase() === (plan ?? "").toLowerCase() && p.desde === desde,
        );
        if (repetido)
          throw new ErrorCelda(
            `Ya hay un precio${plan ? ` del plan ${plan}` : ""} desde ${desde} en la fila ${repetido.fila}.`,
          );
        s.precios.push({ fila, plan, valor: dinero(v("precio"), "El precio"), desde, hasta });
      } else if (texto(v("desde")) || texto(v("hasta"))) {
        throw new ErrorCelda("Hay fechas de vigencia sin precio.");
      }

      const concepto = texto(v("costoConcepto"));
      if (concepto) {
        if (concepto.length > 80) throw new ErrorCelda("El concepto del costo admite máximo 80 caracteres.");
        if (texto(v("costoValor")) === "") throw new ErrorCelda(`Falta el valor del costo "${concepto}".`);
        if (s.costos.some((c) => c.concepto.toLowerCase() === concepto.toLowerCase()))
          throw new ErrorCelda(`El costo "${concepto}" está repetido.`);
        s.costos.push({
          fila,
          concepto,
          valor: dinero(v("costoValor"), "El valor del costo"),
          periodicidad: periodicidad(v("costoPeriodicidad")),
        });
      } else if (texto(v("costoValor")) !== "") {
        throw new ErrorCelda("Hay un valor de costo sin concepto.");
      }
    } catch (error) {
      if (!(error instanceof ErrorCelda)) throw error;
      errores.push({ fila, codigo: codigo || undefined, mensaje: error.message });
    }
  });

  for (const s of porCodigo.values()) {
    if (s.planes.length && s.tipo === "PROYECTO")
      errores.push({
        fila: s.fila,
        codigo: s.codigo,
        mensaje: "Solo los servicios mensuales tienen planes.",
      });
    if (s.planes.length && s.precios.some((p) => p.plan === null))
      errores.push({
        fila: s.precios.find((p) => p.plan === null)!.fila,
        codigo: s.codigo,
        mensaje: "Este servicio tiene planes: cada precio debe decir a qué plan pertenece.",
      });
    s.precios.sort((a, b) => (a.desde < b.desde ? -1 : 1));
  }
  if (leidas === 0) errores.push({ fila: null, mensaje: "El archivo no tiene filas con servicios." });
  errores.sort((a, b) => (a.fila ?? 0) - (b.fila ?? 0));
  return { servicios: [...porCodigo.values()], errores, filas: leidas };
}
