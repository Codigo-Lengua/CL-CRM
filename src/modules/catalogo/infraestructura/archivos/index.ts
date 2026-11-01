import type { Celda } from "../../dominio/importacion/lectura";
import { decodificar, leerCsv } from "./csv";
import { leerExcel } from "./excel";
import { leerPdf } from "./pdf";

/** Estrategia por formato: agregar uno nuevo es agregar una entrada aquí. */
interface Lector {
  formato: string;
  extensiones: string[];
  /** Firma de los primeros bytes, para no confiar solo en el nombre del archivo. */
  firma?: number[];
  leer(bytes: Uint8Array): Promise<Celda[][]>;
}

const LECTORES: readonly Lector[] = [
  { formato: "Excel", extensiones: [".xlsx"], firma: [0x50, 0x4b, 0x03, 0x04], leer: leerExcel },
  { formato: "CSV", extensiones: [".csv", ".txt"], leer: (b) => Promise.resolve(leerCsv(decodificar(b))) },
  { formato: "PDF", extensiones: [".pdf"], firma: [0x25, 0x50, 0x44, 0x46], leer: leerPdf },
];

export const EXTENSIONES_ACEPTADAS = LECTORES.flatMap((l) => l.extensiones).filter((e) => e !== ".txt");
export const TAMANO_MAXIMO = 5 * 1024 * 1024;

export class ErrorArchivo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorArchivo";
  }
}

export async function leerArchivo(
  nombre: string,
  bytes: Uint8Array,
): Promise<{ formato: string; filas: Celda[][] }> {
  if (bytes.byteLength === 0) throw new ErrorArchivo("El archivo está vacío.");
  if (bytes.byteLength > TAMANO_MAXIMO) throw new ErrorArchivo("El archivo pesa más de 5 MB.");
  const extension = nombre.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  if (extension === ".xls")
    throw new ErrorArchivo(
      "El formato .xls es antiguo: guárdalo como .xlsx (Libro de Excel) y vuelve a subirlo.",
    );
  const lector = LECTORES.find((l) => l.extensiones.includes(extension));
  if (!lector) throw new ErrorArchivo("Sube un archivo de Excel (.xlsx), CSV (.csv) o PDF (.pdf).");
  if (lector.firma && !lector.firma.every((b, i) => bytes[i] === b))
    throw new ErrorArchivo(`El archivo no parece un ${lector.formato} válido.`);
  try {
    return { formato: lector.formato, filas: await lector.leer(bytes) };
  } catch (error) {
    if (error instanceof ErrorArchivo) throw error;
    throw new ErrorArchivo(
      `No pude leer el ${lector.formato}. Revisa que no esté dañado ni protegido con clave.`,
    );
  }
}
