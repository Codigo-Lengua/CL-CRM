import writeXlsxFile, { type SheetData } from "write-excel-file/node";
import { COLUMNAS } from "../../dominio/importacion/columnas";
import { type ParametrosPlantilla, tablaDeEjemplo } from "../../dominio/importacion/plantilla";
import { escribirCsv } from "./csv";

/** Colores del encabezado: los de la marca de la organización (primario y su texto). */
export interface ColoresPlantilla {
  fondo: string;
  texto: string;
}

export function plantillaCsv(parametros: ParametrosPlantilla): string {
  return escribirCsv(tablaDeEjemplo(parametros));
}

/** Hoja "Catálogo" con el ejemplo y hoja "Instrucciones" con cada columna y los valores válidos. */
export async function plantillaExcel(
  parametros: ParametrosPlantilla,
  colores: ColoresPlantilla,
): Promise<Buffer> {
  const ENCABEZADO = {
    fontWeight: "bold",
    textColor: colores.texto,
    backgroundColor: colores.fondo,
  } as const;
  const [encabezado, ...filas] = tablaDeEjemplo(parametros);
  const catalogo: SheetData = [
    encabezado!.map((value) => ({ value: String(value), ...ENCABEZADO })),
    ...filas.map((f) =>
      f.map((value) =>
        typeof value === "number" ? { value, format: "#,##0" } : value === null ? null : { value },
      ),
    ),
  ];
  const instrucciones: SheetData = [
    [
      { value: "Columna", ...ENCABEZADO },
      { value: "Cómo llenarla", ...ENCABEZADO },
    ],
    ...COLUMNAS.map((c) => [
      { value: c.encabezado, fontWeight: "bold" as const },
      { value: c.ayuda, wrap: true },
    ]),
    [null, null],
    [
      { value: "Líneas de servicio", fontWeight: "bold" as const },
      { value: parametros.lineas.join(", ") || "—", wrap: true },
    ],
    [
      { value: "Impuesto de ejemplo", fontWeight: "bold" as const },
      { value: parametros.impuesto ?? "La organización aún no tiene impuestos creados.", wrap: true },
    ],
  ];
  return writeXlsxFile([
    {
      data: catalogo,
      sheet: "Catálogo",
      stickyRowsCount: 1,
      columns: COLUMNAS.map((c) => ({
        width: c.clave === "incluye" ? 50 : Math.max(12, c.encabezado.length + 4),
      })),
    },
    { data: instrucciones, sheet: "Instrucciones", columns: [{ width: 26 }, { width: 90 }] },
  ]).toBuffer();
}
