import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { aplicarPlantilla } from "@/modules/parametros/infraestructura/prisma";
import { esquemaNegocio } from "../aplicacion/esquemas";
import {
  type Actor,
  crearNegocio,
  ErrorEmbudo,
  guardarEtapas,
  moverNegocio,
  obtenerNegocio,
  reabrirNegocio,
  tablero,
} from "../aplicacion/negocios";
import { leerEtapas, motivosDePerdida } from "../infraestructura/prisma";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const plataforma = dbPlataforma();
const orgA = randomUUID();
const orgB = randomUUID();
const admin: Actor = { usuarioId: randomUUID(), alcance: "todos" };
const asesora: Actor = { usuarioId: randomUUID(), alcance: "asignados" };
let empresaAsesora = "";
let empresaAjena = "";

const datos = (nombre: string) => esquemaNegocio.parse({ nombre, valorEstimado: "1.200.000" });
const etapa = async (nombre: string) => (await leerEtapas()).find((e) => e.nombre === nombre)!.id;

beforeAll(async () => {
  await plataforma.organization.createMany({
    data: [
      { id: orgA, name: "Embudo A", slug: `embudo-a-${orgA}`, createdAt: new Date() },
      { id: orgB, name: "Embudo B", slug: `embudo-b-${orgB}`, createdAt: new Date() },
    ],
  });
  await conOrganizacion(orgA, async () => {
    await aplicarPlantilla();
    empresaAsesora = (
      await db().empresa.create({ data: { nombre: "Spa Aurora", asesorId: asesora.usuarioId } })
    ).id;
    empresaAjena = (await db().empresa.create({ data: { nombre: "Spa Ajeno" } })).id;
  });
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId: { in: [orgA, orgB] } } });
  await plataforma.organization.deleteMany({ where: { id: { in: [orgA, orgB] } } });
  await plataforma.$disconnect();
});

describe("Embudo en la base de datos", () => {
  it("RN-01 la plantilla siembra el embudo de CÓDIGO LENGUA una sola vez", async () => {
    await conOrganizacion(orgA, () => aplicarPlantilla());
    const etapas = await conOrganizacion(orgA, () => leerEtapas());
    expect(etapas.map((e) => e.nombre)).toEqual([
      "Prospecto",
      "Contactado",
      "Interesado",
      "Demo agendada",
      "Demo realizada",
      "Propuesta enviada",
      "Ganado",
      "Entregado",
      "Perdido",
    ]);
  });

  it("D-14 el negocio nace en Prospecto y la empresa no tiene dos abiertos", async () => {
    await conOrganizacion(orgA, async () => {
      const r = await crearNegocio(asesora, empresaAsesora, datos("Página web"));
      expect(r.ok).toBe(true);
      const otro = await crearNegocio(asesora, empresaAsesora, datos("Bot"));
      expect(otro).toMatchObject({ ok: false, existente: { nombre: "Página web" } });
      const negocio = await db().negocio.findFirstOrThrow({ include: { etapa: true, historial: true } });
      expect(negocio.etapa.nombre).toBe("Prospecto");
      expect(negocio.asesorId).toBe(asesora.usuarioId);
      expect(Number(negocio.valorEstimado)).toBe(1_200_000);
      expect(negocio.historial).toHaveLength(1);
    });
  });

  it("RN-21 la asesora no crea negocios en empresas ajenas ni ve los de otros", async () => {
    await conOrganizacion(orgA, async () => {
      await expect(crearNegocio(asesora, empresaAjena, datos("Otro"))).rejects.toBeInstanceOf(ErrorEmbudo);
      const ajeno = await crearNegocio(admin, empresaAjena, datos("Bot de citas"));
      if (!ajeno.ok) throw new Error("no creó");
      await expect(obtenerNegocio(asesora, ajeno.id)).resolves.toBeNull();
      const { negocios } = await tablero(asesora, {});
      expect(negocios.map((n) => n.nombre)).toEqual(["Página web"]);
    });
  });

  it("RN-21 y RN-25 la asesora avanza hasta la propuesta y cada paso queda en el historial", async () => {
    await conOrganizacion(orgA, async () => {
      const { id } = await db().negocio.findFirstOrThrow({ where: { nombre: "Página web" } });
      await moverNegocio(asesora, id, await etapa("Demo agendada"));
      await moverNegocio(asesora, id, await etapa("Propuesta enviada"));
      await expect(moverNegocio(asesora, id, await etapa("Ganado"))).rejects.toThrow(/cierran/);
      const historial = await db().historialEtapa.findMany({
        where: { negocioId: id },
        orderBy: { cambiadoEn: "asc" },
      });
      expect(historial).toHaveLength(3);
      expect(historial[2]).toMatchObject({ usuarioId: asesora.usuarioId });
    });
  });

  it("RN-23 ni administración pasa a ganado sin cotización aceptada", async () => {
    await conOrganizacion(orgA, async () => {
      const { id } = await db().negocio.findFirstOrThrow({ where: { nombre: "Página web" } });
      await expect(moverNegocio(admin, id, await etapa("Ganado"))).rejects.toThrow(/cotización aceptada/);
    });
  });

  it("RN-22 perder exige un motivo del diccionario, y DEVOLUCION no se elige a mano", async () => {
    await conOrganizacion(orgA, async () => {
      const { id } = await db().negocio.findFirstOrThrow({ where: { nombre: "Página web" } });
      const perdido = await etapa("Perdido");
      await expect(moverNegocio(asesora, id, perdido)).rejects.toThrow(/motivo/);
      const devolucion = await db().valorCatalogo.findFirstOrThrow({ where: { codigo: "DEVOLUCION" } });
      await expect(moverNegocio(asesora, id, perdido, { motivoPerdidaId: devolucion.id })).rejects.toThrow(
        /motivo/,
      );
      expect((await motivosDePerdida()).map((m) => m.etiqueta)).not.toContain("Devolución");

      const precio = (await motivosDePerdida()).find((m) => m.etiqueta === "Precio")!;
      await moverNegocio(asesora, id, perdido, { motivoPerdidaId: precio.id, nota: "Le pareció caro" });
      const negocio = await db().negocio.findUniqueOrThrow({ where: { id } });
      expect(negocio.perdidoEn).not.toBeNull();
      expect(negocio.motivoPerdidaId).toBe(precio.id);
    });
  });

  it("reabrir vuelve a Propuesta enviada; la asesora no puede, administración sí", async () => {
    await conOrganizacion(orgA, async () => {
      const { id } = await db().negocio.findFirstOrThrow({ where: { nombre: "Página web" } });
      await expect(reabrirNegocio(asesora, id)).rejects.toBeInstanceOf(ErrorEmbudo);
      await reabrirNegocio(admin, id);
      const negocio = await db().negocio.findUniqueOrThrow({ where: { id }, include: { etapa: true } });
      expect(negocio.etapa.nombre).toBe("Propuesta enviada");
      expect(negocio.perdidoEn).toBeNull();
    });
  });

  it("RN-02 otra organización no ve los negocios ni hereda el embudo editado", async () => {
    const { negocios } = await conOrganizacion(orgB, () => tablero(admin, {}));
    expect(negocios).toHaveLength(0);
  });

  it("las etapas se editan, pero una con negocios no se desactiva y el embudo sigue siendo válido", async () => {
    await conOrganizacion(orgA, async () => {
      const etapas = await leerEtapas();
      const lista = etapas.map(({ id, nombre, tipoSistema, limiteAsesor, probabilidad, activo }) => ({
        id,
        nombre: nombre === "Interesado" ? "Con interés" : nombre,
        tipoSistema,
        limiteAsesor,
        probabilidad,
        activo,
      }));
      await guardarEtapas(admin.usuarioId, lista);
      expect((await leerEtapas()).map((e) => e.nombre)).toContain("Con interés");

      const sinPropuesta = lista.map((e) => (e.nombre === "Propuesta enviada" ? { ...e, activo: false } : e));
      await expect(guardarEtapas(admin.usuarioId, sinPropuesta)).rejects.toThrow(/tiene negocios|límite/);
      const sinLimite = lista.map((e) => ({ ...e, limiteAsesor: false }));
      await expect(guardarEtapas(admin.usuarioId, sinLimite)).rejects.toThrow(/límite/);
    });
  });
});
