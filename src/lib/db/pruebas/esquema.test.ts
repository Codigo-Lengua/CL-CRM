import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { MODELOS_GLOBALES } from "../organizacion";

const carpeta = join(process.cwd(), "prisma/schema");
const modelos = readdirSync(carpeta)
  .filter((f) => f.endsWith(".prisma"))
  .flatMap((f) => [...readFileSync(join(carpeta, f), "utf8").matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)])
  .map(([, nombre, cuerpo]) => ({ nombre, cuerpo }));

describe("RN-02 esquema", () => {
  it("RN-02 todo modelo que no es global tiene organizacionId", () => {
    const sinOrganizacion = modelos
      .filter((m) => !MODELOS_GLOBALES.has(m.nombre))
      .filter((m) => !/^\s+organizacionId\s/m.test(m.cuerpo))
      .map((m) => m.nombre);
    expect(sinOrganizacion).toEqual([]);
  });

  it("RN-02 los modelos globales existen en el esquema", () => {
    const nombres = new Set(modelos.map((m) => m.nombre));
    expect([...MODELOS_GLOBALES].filter((g) => !nombres.has(g))).toEqual([]);
  });
});
