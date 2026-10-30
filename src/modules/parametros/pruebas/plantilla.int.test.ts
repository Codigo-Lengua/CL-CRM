import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { CLAVES } from "../dominio/definiciones";
import { aplicarPlantilla, parametros } from "../infraestructura/prisma";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = randomUUID();
const orgB = randomUUID();

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Parámetros A", slug: `param-a-${orgA}`, createdAt: new Date() },
      { id: orgB, name: "Parámetros B", slug: `param-b-${orgB}`, createdAt: new Date() },
    ],
  });
  await conOrganizacion(orgA, () => aplicarPlantilla());
  await conOrganizacion(orgB, () => aplicarPlantilla());
});

afterAll(async () => {
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("RN-01 plantilla en la base de datos", () => {
  it("RN-01 la organización nueva queda con todas las claves, diccionarios y canales", async () => {
    const [configuracion, catalogos, canales] = await conOrganizacion(orgA, () =>
      Promise.all([db().configuracion.count(), db().valorCatalogo.count(), db().canalEnvio.findMany()]),
    );
    expect(configuracion).toBe(CLAVES.length);
    expect(catalogos).toBeGreaterThan(20);
    expect(canales.map((c) => [c.canal, c.prioridad]).sort()).toEqual([
      ["ASESOR", 3],
      ["CORREO", 2],
      ["WHATSAPP", 1],
    ]);
  });

  it("RN-01 aplicar la plantilla otra vez no duplica ni pisa lo que cambió la organización", async () => {
    await conOrganizacion(orgA, async () => {
      await db().configuracion.updateMany({ where: { clave: "dia_liquidacion" }, data: { valor: 10 } });
      await aplicarPlantilla();
    });
    const filas = await conOrganizacion(orgA, () =>
      db().configuracion.findMany({ where: { clave: "dia_liquidacion" } }),
    );
    expect(filas).toHaveLength(1);
    expect(filas[0]!.valor).toBe(10);
  });

  it("RN-01 Parametros.obtener lee el valor de cada organización por separado", async () => {
    parametros().invalidar(orgA);
    await expect(conOrganizacion(orgA, () => parametros().obtener("dia_liquidacion"))).resolves.toBe(10);
    await expect(conOrganizacion(orgB, () => parametros().obtener("dia_liquidacion"))).resolves.toBe(5);
  });

  it("RN-02 un festivo propio de una organización no aparece en otra", async () => {
    await conOrganizacion(orgA, () =>
      db().festivo.create({ data: { fecha: new Date("2026-12-07T00:00:00Z"), nombre: "Aniversario" } }),
    );
    const deB = await conOrganizacion(orgB, () => db().festivo.findMany());
    expect(deB).toHaveLength(0);
  });
});
