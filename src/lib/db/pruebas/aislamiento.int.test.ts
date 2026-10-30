import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma, ErrorSinOrganizacion } from "..";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = `org-a-${randomUUID()}`;
const orgB = `org-b-${randomUUID()}`;

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Organización A", slug: orgA },
      { id: orgB, name: "Organización B", slug: orgB },
    ],
  });
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId: { in: [orgA, orgB] } } });
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("RN-02 aislamiento por organización", () => {
  it("RN-02 sin organización activa la consulta falla", async () => {
    await expect(db().auditoria.findMany()).rejects.toBeInstanceOf(ErrorSinOrganizacion);
  });

  it("RN-02 la escritura asigna la organización activa", async () => {
    const registro = await conOrganizacion(orgA, () =>
      db().auditoria.create({ data: { accion: "CREAR", entidad: "Prueba" } }),
    );
    expect(registro.organizacionId).toBe(orgA);
  });

  it("RN-02 ninguna consulta de una organización devuelve datos de la otra", async () => {
    await conOrganizacion(orgB, () =>
      db().auditoria.create({ data: { accion: "CREAR", entidad: "Prueba" } }),
    );

    const deA = await conOrganizacion(orgA, () => db().auditoria.findMany());
    const deB = await conOrganizacion(orgB, () => db().auditoria.findMany());
    expect(deA.every((r) => r.organizacionId === orgA)).toBe(true);
    expect(deB.every((r) => r.organizacionId === orgB)).toBe(true);
    expect(deA.length).toBeGreaterThan(0);
    expect(deB.length).toBeGreaterThan(0);
  });

  it("RN-02 no se puede leer por id un registro de otra organización", async () => {
    const ajeno = await conOrganizacion(orgB, () =>
      db().auditoria.create({ data: { accion: "CREAR", entidad: "Ajeno" } }),
    );
    const visto = await conOrganizacion(orgA, () => db().auditoria.findUnique({ where: { id: ajeno.id } }));
    expect(visto).toBeNull();
  });

  it("RN-02 no se puede modificar ni borrar en otra organización", async () => {
    const ajeno = await conOrganizacion(orgB, () =>
      db().auditoria.create({ data: { accion: "CREAR", entidad: "Ajeno" } }),
    );
    const actualizados = await conOrganizacion(orgA, () =>
      db().auditoria.updateMany({ where: { id: ajeno.id }, data: { accion: "HACKEO" } }),
    );
    const borrados = await conOrganizacion(orgA, () =>
      db().auditoria.deleteMany({ where: { id: ajeno.id } }),
    );
    expect(actualizados.count).toBe(0);
    expect(borrados.count).toBe(0);
  });

  it("RN-02 no se puede escribir indicando otra organización", async () => {
    await expect(
      conOrganizacion(orgA, () =>
        db().auditoria.create({ data: { accion: "CREAR", entidad: "Prueba", organizacionId: orgB } }),
      ),
    ).rejects.toThrow(/otra organización/);
  });
});
