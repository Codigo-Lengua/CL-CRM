import { extractTextItems } from "unpdf";
import { claveDeEncabezado } from "../../dominio/importacion/columnas";
import type { Celda } from "../../dominio/importacion/lectura";

interface Trozo {
  texto: string;
  x: number;
  fin: number;
}

/**
 * Un PDF no tiene celdas, solo texto con posición. Se agrupa el texto en renglones por su altura,
 * se ubica el renglón de encabezados de la plantilla y cada trozo va a la columna cuyo encabezado
 * empieza a su izquierda. Un renglón sin código continúa la fila anterior (texto que se partió en
 * dos líneas), igual que un código partido en el guion. Funciona con tablas como la del PDF de ejemplo; para otros diseños, mejor Excel.
 */
export async function leerPdf(bytes: Uint8Array): Promise<Celda[][]> {
  const { items } = await extractTextItems(new Uint8Array(bytes));
  const renglones: Trozo[][] = [];
  for (const pagina of items) {
    const porAltura: { y: number; alto: number; trozos: Trozo[] }[] = [];
    for (const item of pagina) {
      if (!item.str.trim()) continue;
      const alto = item.fontSize || item.height || 8;
      let renglon = porAltura.find((r) => Math.abs(r.y - item.y) <= alto * 0.4);
      if (!renglon) porAltura.push((renglon = { y: item.y, alto, trozos: [] }));
      renglon.trozos.push({ texto: item.str, x: item.x, fin: item.x + item.width });
    }
    porAltura.sort((a, b) => b.y - a.y);
    for (const r of porAltura) renglones.push(unirPalabras(r.trozos, r.alto));
  }
  return comoTabla(renglones);
}

/** Junta los trozos que están pegados (palabras de una misma celda). */
function unirPalabras(trozos: Trozo[], alto: number): Trozo[] {
  const ordenados = [...trozos].sort((a, b) => a.x - b.x);
  const unidos: Trozo[] = [];
  for (const t of ordenados) {
    const anterior = unidos.at(-1);
    if (anterior && t.x - anterior.fin < alto * 0.9) {
      anterior.texto = `${anterior.texto}${t.x - anterior.fin > alto * 0.15 ? " " : ""}${t.texto}`.replace(
        /\s+/g,
        " ",
      );
      anterior.fin = Math.max(anterior.fin, t.fin);
    } else unidos.push({ ...t });
  }
  return unidos;
}

export function comoTabla(renglones: Trozo[][]): Celda[][] {
  const esEncabezado = (r: Trozo[]) => r.filter((t) => claveDeEncabezado(t.texto)).length >= 2;
  const indice = renglones.findIndex(
    (r) => esEncabezado(r) && r.some((t) => claveDeEncabezado(t.texto) === "codigo"),
  );
  if (indice < 0) return renglones.map((r) => r.map((t) => t.texto));
  const columnas = renglones[indice]!.map((t) => ({ texto: t.texto, x: t.x }));
  const columnaDe = (t: Trozo) => {
    const margen = 3;
    let elegida = 0;
    columnas.forEach((c, i) => {
      if (c.x - margen <= t.x) elegida = i;
    });
    return elegida;
  };
  const indiceCodigo = columnas.findIndex((c) => claveDeEncabezado(c.texto) === "codigo");
  const tabla: Celda[][] = [columnas.map((c) => c.texto)];
  for (const renglon of renglones.slice(indice + 1)) {
    if (esEncabezado(renglon)) continue; // encabezado repetido en otra página
    const fila: string[] = columnas.map(() => "");
    for (const t of renglon) {
      const i = columnaDe(t);
      fila[i] = fila[i] ? `${fila[i]} ${t.texto}` : t.texto;
    }
    const anterior = tabla.length > 1 ? tabla.at(-1) : undefined;
    // Sin código, o con el código anterior partido en el guion ("WEB-" / "LANDING"): continúa.
    const continua = !fila[indiceCodigo] || String(anterior?.[indiceCodigo] ?? "").endsWith("-");
    if (anterior && continua) {
      fila.forEach((v, i) => {
        const previo = String(anterior[i] ?? "");
        if (v) anterior[i] = !previo ? v : previo.endsWith("-") ? `${previo}${v}` : `${previo} ${v}`;
      });
    } else tabla.push(fila);
  }
  return tabla;
}
