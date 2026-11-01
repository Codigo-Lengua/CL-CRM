import { describe, expect, it } from "vitest";
import { calcularImpuestos, type ImpuestoAplicable } from "../dominio/impuestos";
import { ErrorVigencia, planearNuevoPrecio, precioVigente } from "../dominio/precios";
import { diaAnterior, seTraslapan } from "../dominio/vigencia";

const precios = [
  { id: "p1", valor: 1_000_000, desde: "2026-01-01", hasta: "2026-06-30" },
  { id: "p2", valor: 1_200_000, desde: "2026-07-01", hasta: null },
];

describe("RN-27 precio vigente", () => {
  it("RN-27 toma el precio cuya vigencia cubre el día, incluido el último", () => {
    expect(precioVigente(precios, "2026-06-30")?.id).toBe("p1");
    expect(precioVigente(precios, "2026-07-01")?.id).toBe("p2");
    expect(precioVigente(precios, "2030-01-01")?.id).toBe("p2");
    expect(precioVigente(precios, "2025-12-31")).toBeNull();
  });

  it("RN-27 un precio nuevo cierra el vigente sin fin el día anterior", () => {
    expect(planearNuevoPrecio(precios, { desde: "2026-11-01", hasta: null })).toEqual({
      cerrar: { id: "p2", hasta: "2026-10-31" },
    });
  });

  it("RN-27 rechaza un precio que se cruza con uno cerrado o empieza el mismo día", () => {
    expect(() => planearNuevoPrecio(precios, { desde: "2026-03-01", hasta: "2026-03-31" })).toThrow(
      ErrorVigencia,
    );
    expect(() => planearNuevoPrecio(precios, { desde: "2026-07-01", hasta: null })).toThrow(ErrorVigencia);
    expect(() => planearNuevoPrecio([], { desde: "2026-07-01", hasta: "2026-06-01" })).toThrow(/anterior/);
  });

  it("RN-27 las vigencias se traslapan si comparten un día", () => {
    expect(
      seTraslapan({ desde: "2026-01-01", hasta: "2026-01-31" }, { desde: "2026-01-31", hasta: null }),
    ).toBe(true);
    expect(
      seTraslapan({ desde: "2026-01-01", hasta: "2026-01-31" }, { desde: "2026-02-01", hasta: null }),
    ).toBe(false);
    expect(diaAnterior("2026-03-01")).toBe("2026-02-28");
  });
});

const iva = (cambios: Partial<ImpuestoAplicable> = {}): ImpuestoAplicable => ({
  codigo: "IVA19",
  nombre: "IVA",
  tipo: "TRASLADADO",
  porcentaje: 19,
  incluidoEnPrecio: false,
  activo: true,
  desde: "2026-01-01",
  hasta: null,
  ...cambios,
});

describe("RN-30 impuestos", () => {
  it("RN-30 suma el IVA sobre la base cuando el precio no lo incluye (ejemplo CL-CRM-05)", () => {
    expect(calcularImpuestos(1_900_000, [iva()], "2026-10-31")).toEqual({
      base: 1_900_000,
      impuestos: [{ codigo: "IVA19", nombre: "IVA", tipo: "TRASLADADO", porcentaje: 19, valor: 361_000 }],
      total: 2_261_000,
    });
  });

  it("RN-30 separa el IVA de la base cuando el precio ya lo incluye", () => {
    const d = calcularImpuestos(1_190_000, [iva({ incluidoEnPrecio: true })], "2026-10-31");
    expect(d.base).toBe(1_000_000);
    expect(d.impuestos[0]!.valor).toBe(190_000);
    expect(d.total).toBe(1_190_000);
  });

  it("RN-30 base e impuesto incluido suman el precio aunque haya redondeo", () => {
    const d = calcularImpuestos(99_999, [iva({ incluidoEnPrecio: true })], "2026-10-31");
    expect(d.base + d.impuestos[0]!.valor).toBe(99_999);
    expect(d.total).toBe(99_999);
  });

  it("RN-30 resta las retenciones y omite los impuestos inactivos o fuera de vigencia", () => {
    const rete = iva({ codigo: "RETE", nombre: "Retención", tipo: "RETENIDO", porcentaje: 4 });
    const viejo = iva({ codigo: "IVA16", porcentaje: 16, hasta: "2016-12-31", desde: "2010-01-01" });
    const apagado = iva({ codigo: "ICA", porcentaje: 1, activo: false });
    const d = calcularImpuestos(1_000_000, [iva(), rete, viejo, apagado], "2026-10-31");
    expect(d.impuestos.map((i) => i.codigo)).toEqual(["IVA19", "RETE"]);
    expect(d.total).toBe(1_000_000 + 190_000 - 40_000);
  });

  it("RN-30 sin impuestos configurados el total es el precio", () => {
    expect(calcularImpuestos(500_000, [], "2026-10-31")).toEqual({
      base: 500_000,
      impuestos: [],
      total: 500_000,
    });
  });
});
