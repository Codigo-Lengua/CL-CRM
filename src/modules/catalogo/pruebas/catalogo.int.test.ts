import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import {
  agregarCosto,
  agregarPrecio,
  asignarImpuestos,
  catalogoPublico,
  ErrorCatalogo,
  guardarImpuesto,
  guardarPlan,
  guardarServicio,
  obtenerServicio,
} from "../aplicacion/catalogo";
import {
  esquemaCosto,
  esquemaImpuesto,
  esquemaPlan,
  esquemaPrecio,
  esquemaServicio,
} from "../aplicacion/esquemas";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = randomUUID();
const orgB = randomUUID();
const usuario = randomUUID();
let web = "";
let bot = "";

const servicio = (codigo: string, nombre: string, tipo = "PROYECTO") =>
  esquemaServicio.parse({ codigo, nombre, tipo, visibleWeb: "on", activo: "on" });

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Catálogo A", slug: `catalogo-a-${orgA}`, createdAt: new Date() },
      { id: orgB, name: "Catálogo B", slug: `catalogo-b-${orgB}`, createdAt: new Date() },
    ],
  });
  await conOrganizacion(orgA, async () => {
    web = await guardarServicio(usuario, servicio("WEB", "Página web"));
    bot = await guardarServicio(usuario, servicio("BOT", "Bot de WhatsApp", "MENSUAL"));
  });
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId: { in: [orgA, orgB] } } });
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("Catálogo en la base de datos", () => {
  it("el código del servicio es único por organización, no entre organizaciones", async () => {
    await expect(
      conOrganizacion(orgA, () => guardarServicio(usuario, servicio("WEB", "Otra"))),
    ).rejects.toBeInstanceOf(ErrorCatalogo);
    await expect(
      conOrganizacion(orgB, () => guardarServicio(usuario, servicio("WEB", "Web de B"))),
    ).resolves.toBeTruthy();
  });

  it("RN-27 un precio nuevo cierra el anterior y nunca lo sobrescribe", async () => {
    await conOrganizacion(orgA, async () => {
      await agregarPrecio(usuario, web, esquemaPrecio.parse({ valor: "1.000.000", desde: "2026-01-01" }));
      await agregarPrecio(usuario, web, esquemaPrecio.parse({ valor: "1.200.000", desde: "2026-11-01" }));
      const precios = await db().precio.findMany({
        where: { servicioId: web },
        orderBy: { vigenteDesde: "asc" },
      });
      expect(
        precios.map((p) => [Number(p.valor), p.vigenteHasta?.toISOString().slice(0, 10) ?? null]),
      ).toEqual([
        [1_000_000, "2026-10-31"],
        [1_200_000, null],
      ]);
    });
  });

  it("RN-27 se rechaza un precio que se cruza con otro", async () => {
    await expect(
      conOrganizacion(orgA, () =>
        agregarPrecio(
          usuario,
          web,
          esquemaPrecio.parse({ valor: "900000", desde: "2026-05-01", hasta: "2026-05-31" }),
        ),
      ),
    ).rejects.toThrow(/Se cruza/);
  });

  it("RN-27 la base de datos impide el traslape aunque alguien salte la regla", async () => {
    await expect(
      conOrganizacion(orgA, () =>
        db().precio.create({
          data: {
            servicioId: web,
            valor: 1,
            vigenteDesde: new Date("2026-03-01"),
            vigenteHasta: new Date("2026-03-02"),
          },
        }),
      ),
    ).rejects.toThrow(/precio_servicio_sin_traslape/);
    await expect(
      conOrganizacion(orgA, () =>
        db().precio.create({ data: { valor: 1, vigenteDesde: new Date("2027-01-01") } }),
      ),
    ).rejects.toThrow(/precio_servicio_o_plan/);
  });

  it("un servicio con planes pide el precio por plan", async () => {
    await conOrganizacion(orgA, async () => {
      const basico = await guardarPlan(
        usuario,
        bot,
        esquemaPlan.parse({ nombre: "Básico", limiteUso: "500", activo: "on" }),
      );
      await expect(
        agregarPrecio(usuario, bot, esquemaPrecio.parse({ valor: "150000", desde: "2026-01-01" })),
      ).rejects.toThrow(/elige a qué plan/);
      await agregarPrecio(
        usuario,
        bot,
        esquemaPrecio.parse({ planId: basico, valor: "150000", desde: "2026-01-01" }),
      );
      await expect(
        guardarPlan(usuario, web, esquemaPlan.parse({ nombre: "X1", activo: "on" })),
      ).rejects.toThrow(/mensuales/);
    });
  });

  it("RN-30 el precio vigente trae su desglose de impuestos", async () => {
    await conOrganizacion(orgA, async () => {
      await guardarImpuesto(
        usuario,
        esquemaImpuesto.parse({
          codigo: "IVA19",
          nombre: "IVA",
          tipo: "TRASLADADO",
          porcentaje: "19",
          desde: "2026-01-01",
          activo: "on",
        }),
      );
      const iva = await db().impuesto.findFirstOrThrow({ where: { codigo: "IVA19" } });
      await asignarImpuestos(usuario, web, [iva.id]);
      const ficha = await obtenerServicio(web, true);
      expect(ficha?.vigente).toMatchObject({ base: 1_200_000, total: 1_428_000 });
    });
  });

  it("el catálogo público nunca trae costos y deja sin precio la cotización manual", async () => {
    await conOrganizacion(orgA, async () => {
      await agregarCosto(
        usuario,
        web,
        esquemaCosto.parse({ concepto: "Hosting", valor: "300000", periodicidad: "ANUAL" }),
      );
      await guardarServicio(
        usuario,
        esquemaServicio.parse({
          codigo: "APP",
          nombre: "Aplicación",
          tipo: "PROYECTO",
          visibleWeb: "on",
          requiereCotizacionManual: "on",
          activo: "on",
        }),
      );
      await guardarServicio(
        usuario,
        esquemaServicio.parse({ codigo: "OCULTO", nombre: "Interno", tipo: "PROYECTO", activo: "on" }),
      );
      const publico = await catalogoPublico("2026-11-15");
      const texto = JSON.stringify(publico);
      expect(texto).not.toContain("Hosting");
      expect(texto).not.toContain("300000");
      expect(publico.servicios.map((s) => s.codigo)).toEqual(expect.arrayContaining(["WEB", "BOT", "APP"]));
      expect(publico.servicios.map((s) => s.codigo)).not.toContain("OCULTO");
      expect(publico.servicios.find((s) => s.codigo === "APP")?.precio).toBeNull();
      expect(publico.servicios.find((s) => s.codigo === "WEB")?.precio?.desglose.total).toBe(1_428_000);
      expect(publico.servicios.find((s) => s.codigo === "BOT")?.planes[0]?.precio?.valor).toBe(150_000);
    });
  });

  it("RN-02 otra organización no ve el catálogo ajeno", async () => {
    const publico = await conOrganizacion(orgB, () => catalogoPublico("2026-11-15"));
    expect(publico.servicios.map((s) => s.nombre)).toEqual(["Web de B"]);
  });

  it("los costos solo salen en la ficha para quien puede verlos", async () => {
    const [con, sin] = await conOrganizacion(orgA, () =>
      Promise.all([obtenerServicio(web, true), obtenerServicio(web, false)]),
    );
    expect(con?.costos?.map((c) => c.concepto)).toEqual(["Hosting"]);
    expect(sin?.costos).toBeNull();
  });
});
