import readXlsxFile from "read-excel-file/node";
import type { Celda } from "../../dominio/importacion/lectura";
import { normalizar } from "../../dominio/importacion/columnas";

/** Lee la hoja "Catálogo" si existe; si no, la primera. */
export async function leerExcel(bytes: Uint8Array): Promise<Celda[][]> {
  const hojas = await readXlsxFile(Buffer.from(bytes));
  const hoja = hojas.find((h) => normalizar(h.sheet) === "catalogo") ?? hojas[0];
  return (hoja?.data ?? []) as Celda[][];
}
