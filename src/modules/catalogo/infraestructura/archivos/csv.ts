import type { Celda } from "../../dominio/importacion/lectura";

/** Excel en español guarda CSV en Windows-1252; si el texto no es UTF-8 válido, se lee así. */
export function decodificar(bytes: Uint8Array): string {
  let texto: string;
  try {
    texto = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    texto = new TextDecoder("windows-1252").decode(bytes);
  }
  return texto.replace(/^﻿/, "");
}

/** Coma, punto y coma (Excel en español) o tabulador: el que más aparezca en la primera línea. */
function separadorDe(texto: string): string {
  const primera = texto.slice(0, texto.search(/\r?\n|$/));
  const conteos = [",", ";", "\t"].map((s) => [s, primera.split(s).length] as const);
  return conteos.sort((a, b) => b[1] - a[1])[0]![0];
}

/** RFC 4180: comillas dobles, comillas escapadas ("") y saltos de línea dentro de una celda. */
export function leerCsv(texto: string): Celda[][] {
  const separador = separadorDe(texto);
  const filas: Celda[][] = [];
  let fila: string[] = [];
  let celda = "";
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!;
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else celda += c;
    } else if (c === '"' && celda === "") entreComillas = true;
    else if (c === separador) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      fila.push(celda);
      filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  if (celda !== "" || fila.length) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

const escapar = (v: string) => (/[",;\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** CSV con punto y coma y BOM: así Excel en español lo abre en columnas y con tildes. */
export function escribirCsv(filas: readonly (readonly (string | number | null)[])[]): string {
  return `﻿${filas.map((f) => f.map((v) => escapar(v === null ? "" : String(v))).join(";")).join("\r\n")}\r\n`;
}
