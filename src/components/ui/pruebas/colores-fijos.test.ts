import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";

// Los colores solo viven en los tokens de la marca. Fuera de estas rutas, un hex o una
// clase de la paleta de Tailwind es un color fijo que no cambiaría con la marca (#43).
const RAIZ = join(process.cwd(), "src");
const PERMITIDOS = ["modules/marca/dominio/", "generated/"];

const PALETA =
  /\b(?:bg|text|border|ring|divide|from|via|to|outline|fill|stroke|decoration|placeholder|shadow|accent|caret)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|white|black)(?:-\d{2,3})?\b/;
const HEX = /#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b(?![\w-])/;

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((nombre) => {
    const ruta = join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return nombre === "pruebas" ? [] : archivos(ruta);
    return /\.(tsx?|css)$/.test(nombre) ? [ruta] : [];
  });
}

describe("Sistema de diseño", () => {
  it("ningún componente usa un color fijo", () => {
    const hallazgos = archivos(RAIZ)
      .map((ruta) => relative(RAIZ, ruta))
      .filter((ruta) => !PERMITIDOS.some((p) => ruta.startsWith(p)) && ruta !== "app/globals.css")
      .flatMap((ruta) =>
        readFileSync(join(RAIZ, ruta), "utf8")
          .split("\n")
          .flatMap((linea, i) =>
            PALETA.test(linea) || HEX.test(linea) ? [`${ruta}:${i + 1}: ${linea.trim()}`] : [],
          ),
      );
    expect(hallazgos).toEqual([]);
  });
});
