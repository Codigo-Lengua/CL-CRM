import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contraste } from "../dominio/contraste";
import { completarMarca, MARCA_CODIGO_LENGUA } from "../dominio/marca";
import { derivarTokens, NOMBRES_TOKENS, revisarContraste } from "../dominio/tokens";

describe("Marca por organización", () => {
  it("el contraste de blanco sobre negro es 21 y de un color consigo mismo es 1", () => {
    expect(contraste("#FFFFFF", "#000000")).toBeCloseTo(21, 5);
    expect(contraste("#B263DF", "#B263DF")).toBe(1);
  });

  it("la marca de CÓDIGO LENGUA cumple AA en modo oscuro y claro", () => {
    expect(revisarContraste(MARCA_CODIGO_LENGUA)).toEqual([]);
  });

  it("una marca con contraste insuficiente se rechaza", () => {
    const problemas = revisarContraste({
      colores: { ...MARCA_CODIGO_LENGUA.colores, fondo: "#8A8A8A", lienzo: "#9A9A9A" },
    });
    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.some((p) => p.nombre === "el texto sobre el fondo")).toBe(true);
  });

  it("el texto de los botones principales elige el color que más contrasta", () => {
    const amarillo = derivarTokens({ ...MARCA_CODIGO_LENGUA.colores, primario: "#FACC15" }, "oscuro");
    expect(amarillo["sobre-primario"]).toBe(MARCA_CODIGO_LENGUA.colores.fondo);
  });

  it("en modo claro el primario se oscurece hasta que sus enlaces se leen", () => {
    const claro = derivarTokens(MARCA_CODIGO_LENGUA.colores, "claro");
    expect(contraste(claro.enlace, claro.fondo)).toBeGreaterThanOrEqual(4.5);
  });

  it("lo que falta en la marca guardada sale del tema por defecto", () => {
    const marca = completarMarca({ colores: { primario: "#2563eb" }, nombreComercial: "Spa Aurora" });
    expect(marca.colores.primario).toBe("#2563EB");
    expect(marca.colores.fondo).toBe(MARCA_CODIGO_LENGUA.colores.fondo);
    expect(marca.nombreComercial).toBe("Spa Aurora");
    expect(marca.fuentes).toEqual(MARCA_CODIGO_LENGUA.fuentes);
  });

  it("una marca guardada inválida o con logos peligrosos da el tema por defecto", () => {
    expect(completarMarca({ colores: { primario: "violeta" } })).toEqual(MARCA_CODIGO_LENGUA);
    expect(completarMarca({ logos: { isotipo: "javascript:alert(1)" } })).toEqual(MARCA_CODIGO_LENGUA);
    expect(completarMarca(null)).toEqual(MARCA_CODIGO_LENGUA);
  });

  it("globals.css trae los mismos tokens que deriva el tema por defecto", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    for (const modo of ["oscuro", "claro"] as const) {
      const bloque = css.split(`/* tokens:${modo} */`)[1]?.split("/* fin */")[0] ?? "";
      const tokens = derivarTokens(MARCA_CODIGO_LENGUA.colores, modo);
      for (const nombre of NOMBRES_TOKENS) {
        expect(bloque.toLowerCase(), `${modo} ${nombre}`).toContain(
          `--color-${nombre}: ${tokens[nombre].toLowerCase()};`,
        );
      }
    }
  });
});
