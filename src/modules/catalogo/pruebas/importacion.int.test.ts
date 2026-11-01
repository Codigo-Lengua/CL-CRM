import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { ErrorCatalogo, guardarImpuesto, obtenerServicio } from "../aplicacion/catalogo";
import { esquemaImpuesto } from "../aplicacion/esquemas";
import { importarCatalogo, revisarImportacion } from "../aplicacion/importacion";
import { tablaDeEjemplo } from "../dominio/importacion/plantilla";
import { escribirCsv } from "../infraestructura/archivos/csv";
import { plantillaExcel } from "../infraestructura/archivos/plantilla";
import { MARCA_CODIGO_LENGUA } from "@/modules/marca/dominio/marca";
import { derivarTokens } from "@/modules/marca/dominio/tokens";

const tokens = derivarTokens(MARCA_CODIGO_LENGUA.colores, "claro");
const colores = { fondo: tokens.primario, texto: tokens["sobre-primario"] };

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = randomUUID();
const orgB = randomUUID();
const usuario = randomUUID();
const parametros = { lineas: ["Sitio web"], impuesto: "IVA", hoy: "2026-11-01" };
const csv = (filas: (string | number | null)[][]) => new TextEncoder().encode(escribirCsv(filas));

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Importa A", slug: `importa-a-${orgA}`, createdAt: new Date() },
      { id: orgB, name: "Importa B", slug: `importa-b-${orgB}`, createdAt: new Date() },
    ],
  });
  await conOrganizacion(orgA, () =>
    guardarImpuesto(
      usuario,
      esquemaImpuesto.parse({
        codigo: "IVA",
        nombre: "IVA",
        tipo: "TRASLADADO",
        porcentaje: "19",
        desde: "2020-01-01",
        activo: "on",
      }),
    ),
  );
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId: { in: [orgA, orgB] } } });
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("Importación del catálogo en la base de datos", () => {
  it("la vista previa no escribe nada", async () => {
    const libro = new Uint8Array(await plantillaExcel(parametros, colores));
    const { plan } = await conOrganizacion(orgA, () => revisarImportacion("plantilla.xlsx", libro));
    expect(plan.errores).toEqual([]);
    expect(plan.resumen).toMatchObject({ crear: 3, precios: 3, costos: 3 });
    expect(await conOrganizacion(orgA, () => db().servicio.count())).toBe(0);
  });

  it("importa la plantilla de Excel completa: servicios, planes, precios, costos, impuestos y líneas", async () => {
    const libro = new Uint8Array(await plantillaExcel(parametros, colores));
    const resumen = await conOrganizacion(orgA, () => importarCatalogo(usuario, "plantilla.xlsx", libro));
    expect(resumen).toMatchObject({ crear: 3, actualizar: 0, precios: 3, costos: 3 });
    await conOrganizacion(orgA, async () => {
      const bot = await db().servicio.findFirstOrThrow({
        where: { codigo: "BOT-WA" },
        include: { planes: { include: { precios: true } }, costos: true, impuestos: true },
      });
      expect(bot.planes.map((p) => [p.nombre, p.limiteUso, Number(p.precios[0]!.valor)]).sort()).toEqual([
        ["Básico", 1000, 450000],
        ["Pro", 5000, 850000],
      ]);
      expect(bot.costos.map((c) => c.periodicidad)).toEqual(["MENSUAL"]);
      expect(bot.impuestos).toHaveLength(1);
      // Las líneas que no existían se crean en el diccionario de la organización.
      expect(await db().valorCatalogo.count({ where: { tipo: "LINEA_SERVICIO" } })).toBe(1);
      const marca = await db().servicio.findFirstOrThrow({ where: { codigo: "MARCA-360" } });
      expect(marca.requiereCotizacionManual).toBe(true);
    });
  });

  it("RN-27 reimportar el mismo archivo no duplica nada; un precio nuevo cierra el anterior", async () => {
    const libro = new Uint8Array(await plantillaExcel(parametros, colores));
    const otraVez = await conOrganizacion(orgA, () => importarCatalogo(usuario, "plantilla.xlsx", libro));
    expect(otraVez).toMatchObject({ crear: 0, actualizar: 3, precios: 0, preciosIguales: 3 });

    const nuevo = csv([
      ["Código", "Precio", "Vigente desde"],
      ["WEB-LANDING", "2.000.000", "2027-01-01"],
    ]);
    await conOrganizacion(orgA, () => importarCatalogo(usuario, "precios-2027.csv", nuevo));
    await conOrganizacion(orgA, async () => {
      const web = await db().servicio.findFirstOrThrow({ where: { codigo: "WEB-LANDING" } });
      const ficha = (await obtenerServicio(web.id, true))!;
      expect(ficha.precios.map((p) => [p.valor, p.desde, p.hasta])).toEqual([
        [2_000_000, "2027-01-01", null],
        [1_800_000, "2026-11-01", "2026-12-31"],
      ]);
      expect(ficha.costos).toHaveLength(2);
    });
  });

  it("todo o nada: con un error no se guarda ninguna fila y la vista previa lo señala", async () => {
    const malo = csv([
      ["Código", "Nombre", "Tipo", "Precio", "Impuestos"],
      ["SEO-1", "SEO", "Proyecto", "500.000", ""],
      ["ADS-1", "Pauta", "Proyecto", "300.000", "ICA"],
    ]);
    const { plan } = await conOrganizacion(orgA, () => revisarImportacion("malo.csv", malo));
    expect(plan.errores).toEqual([expect.objectContaining({ fila: 3, codigo: "ADS-1" })]);
    await expect(
      conOrganizacion(orgA, () => importarCatalogo(usuario, "malo.csv", malo)),
    ).rejects.toBeInstanceOf(ErrorCatalogo);
    expect(await conOrganizacion(orgA, () => db().servicio.count({ where: { codigo: "SEO-1" } }))).toBe(0);
  });

  it("RN-02 cada organización importa en su catálogo: el mismo código en B es un servicio nuevo", async () => {
    const archivo = csv(tablaDeEjemplo({ ...parametros, impuesto: null }));
    const resumen = await conOrganizacion(orgB, () => importarCatalogo(usuario, "b.csv", archivo));
    expect(resumen).toMatchObject({ crear: 3, actualizar: 0 });
    expect(await conOrganizacion(orgA, () => db().servicio.count())).toBe(3);
    expect(await conOrganizacion(orgB, () => db().servicio.count())).toBe(3);
  });

  it("deja rastro en la auditoría por cada servicio importado", async () => {
    const registros = await plataforma.auditoria.count({
      where: { organizacionId: orgB, accion: "IMPORTAR_CREAR" },
    });
    expect(registros).toBe(3);
  });
});
