import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODELOS_GLOBALES, MODELOS_PLATAFORMA } from "../organizacion";

const carpeta = join(process.cwd(), "prisma/schema");
const modelos = readdirSync(carpeta)
  .filter((f) => f.endsWith(".prisma"))
  .flatMap((f) => [...readFileSync(join(carpeta, f), "utf8").matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)])
  .map(([, nombre, cuerpo]) => ({ nombre, cuerpo }));

describe("RN-02 esquema", () => {
  it("RN-02 todo modelo que no es global tiene organizacionId", () => {
    const sinOrganizacion = modelos
      .filter((m) => !MODELOS_GLOBALES.has(m.nombre) && !MODELOS_PLATAFORMA.has(m.nombre))
      .filter((m) => !/^\s+organizacionId\s/m.test(m.cuerpo))
      .map((m) => m.nombre);
    expect(sinOrganizacion).toEqual([]);
  });

  it("RN-02 toda relación entre tablas de negocio incluye organizacionId en la llave", () => {
    // Con la llave compuesta, un connect o un include nunca cruza a otra organización.
    const deNegocio = new Set(
      modelos.map((m) => m.nombre).filter((n) => !MODELOS_GLOBALES.has(n) && !MODELOS_PLATAFORMA.has(n)),
    );
    const sinOrganizacion = modelos
      .filter((m) => deNegocio.has(m.nombre))
      .flatMap((m) =>
        [...m.cuerpo.matchAll(/^\s+(\w+)\s+(\w+)\??\s+@relation\(([^)]*)\)/gm)]
          .filter(([, , destino, opciones]) => deNegocio.has(destino) && /fields:/.test(opciones))
          .filter(([, , , opciones]) => !/fields:\s*\[[^\]]*\borganizacionId\b/.test(opciones))
          .map(([, campo]) => `${m.nombre}.${campo}`),
      );
    expect(sinOrganizacion).toEqual([]);
  });

  it("RN-02 los modelos globales existen en el esquema", () => {
    const nombres = new Set(modelos.map((m) => m.nombre));
    expect([...MODELOS_GLOBALES, ...MODELOS_PLATAFORMA].filter((g) => !nombres.has(g))).toEqual([]);
  });
});
