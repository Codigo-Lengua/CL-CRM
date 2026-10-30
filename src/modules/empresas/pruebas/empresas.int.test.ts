import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import {
  type Actor,
  agregarContacto,
  crearEmpresa,
  ErrorEmpresaNoVisible,
  listarEmpresas,
  obtenerEmpresa,
  suprimirDatosPersonales,
} from "../aplicacion/empresas";
import { esquemaContacto, esquemaEmpresa } from "../aplicacion/esquemas";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = randomUUID();
const orgB = randomUUID();
const admin: Actor = { usuarioId: randomUUID(), alcance: "todos", pais: "CO" };
const asesora: Actor = { usuarioId: randomUUID(), alcance: "asignados", pais: "CO" };

const empresa = (datos: Record<string, unknown>) => esquemaEmpresa.parse(datos);

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Empresas A", slug: `empresas-a-${orgA}`, createdAt: new Date() },
      { id: orgB, name: "Empresas B", slug: `empresas-b-${orgB}`, createdAt: new Date() },
    ],
  });
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId: { in: [orgA, orgB] } } });
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("Empresas y contactos en la base de datos", () => {
  it("RN-07 no deja registrar dos veces el mismo teléfono, escrito distinto", async () => {
    const primera = await conOrganizacion(orgA, () =>
      crearEmpresa(admin, empresa({ nombre: "Spa Lavanda", telefono: "300 123 4567" })),
    );
    expect(primera.ok).toBe(true);
    const segunda = await conOrganizacion(orgA, () =>
      crearEmpresa(admin, empresa({ nombre: "Lavanda Spa", whatsapp: "+57 (300) 123-4567" })),
    );
    expect(segunda).toMatchObject({
      ok: false,
      duplicado: { nombre: "Spa Lavanda", motivo: "telefono_empresa" },
    });
  });

  it("RN-02 el mismo teléfono en otra organización no es duplicado ni se ve", async () => {
    const enB = await conOrganizacion(orgB, () =>
      crearEmpresa(admin, empresa({ nombre: "Spa de B", telefono: "3001234567" })),
    );
    expect(enB.ok).toBe(true);
    const listaA = await conOrganizacion(orgA, () => listarEmpresas(admin, {}));
    expect(listaA.empresas.map((e) => e.nombre)).toEqual(["Spa Lavanda"]);
  });

  it("RN-07 el teléfono de un contacto de otra empresa también cuenta", async () => {
    const r = await conOrganizacion(orgA, async () => {
      const otra = await crearEmpresa(admin, empresa({ nombre: "Peluquería Sol" }));
      if (!otra.ok) throw new Error("no creó");
      await agregarContacto(
        admin,
        otra.id,
        esquemaContacto.parse({ nombre: "Marta", telefono: "3109998877" }),
      );
      return crearEmpresa(admin, empresa({ nombre: "Sol Peluquería", telefono: "+573109998877" }));
    });
    expect(r).toMatchObject({
      ok: false,
      duplicado: { nombre: "Peluquería Sol", motivo: "telefono_contacto" },
    });
  });

  it("CL-CRM-02 §11 la asesora solo ve y toca lo que tiene asignado", async () => {
    await conOrganizacion(orgA, async () => {
      const suya = await crearEmpresa(asesora, empresa({ nombre: "Barbería Norte" }));
      expect(suya.ok).toBe(true);
      const lista = await listarEmpresas(asesora, {});
      expect(lista.empresas.map((e) => e.nombre)).toEqual(["Barbería Norte"]);

      const ajena = (await listarEmpresas(admin, { q: "Lavanda" })).empresas[0]!;
      await expect(obtenerEmpresa(asesora, ajena.id)).resolves.toBeNull();
      await expect(
        agregarContacto(asesora, ajena.id, esquemaContacto.parse({ nombre: "Intrusa" })),
      ).rejects.toBeInstanceOf(ErrorEmpresaNoVisible);
    });
  });

  it("busca por teléfono normalizado y por nombre de contacto", async () => {
    const [porTelefono, porContacto] = await conOrganizacion(orgA, () =>
      Promise.all([listarEmpresas(admin, { q: "300-123-4567" }), listarEmpresas(admin, { q: "marta" })]),
    );
    expect(porTelefono.empresas.map((e) => e.nombre)).toEqual(["Spa Lavanda"]);
    expect(porContacto.empresas.map((e) => e.nombre)).toEqual(["Peluquería Sol"]);
  });

  it("RN-47 suprimir borra lo personal de la empresa y sus contactos, y libera el teléfono", async () => {
    await conOrganizacion(orgA, async () => {
      const id = (await listarEmpresas(admin, { q: "Peluquería Sol" })).empresas[0]!.id;
      await suprimirDatosPersonales(admin, id);
      const suprimida = await obtenerEmpresa(admin, id);
      expect(suprimida).toMatchObject({ nombre: "Peluquería Sol", noContactar: true, telefono: null });
      expect(suprimida!.contactos[0]).toMatchObject({ nombre: "Contacto suprimido", telefono: null });

      const nueva = await crearEmpresa(admin, empresa({ nombre: "Otra", telefono: "3109998877" }));
      expect(nueva.ok).toBe(true);
    });
  });

  it("#48 la auditoría guarda los teléfonos enmascarados", async () => {
    const registros = await conOrganizacion(orgA, () =>
      db().auditoria.findMany({ where: { entidad: "empresa", accion: "CREAR" } }),
    );
    const texto = JSON.stringify(registros.map((r) => r.despues));
    expect(texto).not.toContain("3001234567");
    expect(texto).toContain("•");
  });
});
