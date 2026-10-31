import { describe, expect, it } from "vitest";
import { type Etapa, ETAPAS_POR_DEFECTO, etapaInicial, problemaDelEmbudo } from "../dominio/etapas";
import { cambiosAlMover, ErrorMotivoPerdida, etapaParaReabrir } from "../dominio/negocio";
import { puedeMover, type QuienMueve } from "../dominio/transiciones";

const etapas: Etapa[] = ETAPAS_POR_DEFECTO.map((e) => ({ ...e, id: e.codigo, activo: true }));
const e = (codigo: string) => etapas.find((x) => x.id === codigo)!;
const asesor: QuienMueve = { alcance: "asignados", esDueno: true };
const admin: QuienMueve = { alcance: "todos", esDueno: false };
const sinCotizacion = { cotizacionAceptada: false };
const conCotizacion = { cotizacionAceptada: true };

describe("RN-21 transiciones del embudo", () => {
  it("RN-21 el asesor avanza y retrocede entre abiertas hasta el límite", () => {
    expect(puedeMover(asesor, e("PROSPECTO"), e("PROPUESTA_ENVIADA"), etapas, sinCotizacion).permitido).toBe(
      true,
    );
    expect(puedeMover(asesor, e("DEMO_REALIZADA"), e("CONTACTADO"), etapas, sinCotizacion).permitido).toBe(
      true,
    );
  });

  it("RN-21 el asesor no cierra un negocio ni pasa del límite", () => {
    const decision = puedeMover(asesor, e("PROPUESTA_ENVIADA"), e("GANADO"), etapas, conCotizacion);
    expect(decision).toEqual({
      permitido: false,
      motivo: "Solo administración o socios cierran un negocio.",
    });
    const otroLimite = etapas.map((x) => ({ ...x, limiteAsesor: x.id === "DEMO_AGENDADA" }));
    expect(
      puedeMover(asesor, e("DEMO_AGENDADA"), e("DEMO_REALIZADA"), otroLimite, sinCotizacion),
    ).toMatchObject({ permitido: false, motivo: "Puedes llegar hasta «Demo agendada»." });
  });

  it("RN-21 el asesor da por perdido un negocio suyo, pero no mueve los ajenos", () => {
    expect(puedeMover(asesor, e("INTERESADO"), e("PERDIDO"), etapas, sinCotizacion).permitido).toBe(true);
    expect(
      puedeMover({ ...asesor, esDueno: false }, e("INTERESADO"), e("CONTACTADO"), etapas, sinCotizacion)
        .permitido,
    ).toBe(false);
  });

  it("RN-21 el asesor no reabre un perdido; administración sí, a una etapa abierta", () => {
    expect(puedeMover(asesor, e("PERDIDO"), e("INTERESADO"), etapas, sinCotizacion).permitido).toBe(false);
    expect(puedeMover(admin, e("PERDIDO"), e("INTERESADO"), etapas, sinCotizacion).permitido).toBe(true);
    expect(puedeMover(admin, e("PERDIDO"), e("GANADO"), etapas, conCotizacion).permitido).toBe(false);
  });

  it("RN-23 pasar a ganado exige una cotización aceptada", () => {
    expect(puedeMover(admin, e("PROPUESTA_ENVIADA"), e("GANADO"), etapas, sinCotizacion).permitido).toBe(
      false,
    );
    expect(puedeMover(admin, e("PROPUESTA_ENVIADA"), e("GANADO"), etapas, conCotizacion).permitido).toBe(
      true,
    );
  });

  it("RN-24 ni administración pasa un ganado o entregado a perdido", () => {
    expect(puedeMover(admin, e("GANADO"), e("PERDIDO"), etapas, conCotizacion).permitido).toBe(false);
    expect(puedeMover(admin, e("ENTREGADO"), e("PERDIDO"), etapas, conCotizacion).permitido).toBe(false);
  });

  it("RN-26 solo un ganado pasa a entregado", () => {
    expect(puedeMover(admin, e("INTERESADO"), e("ENTREGADO"), etapas, conCotizacion).permitido).toBe(false);
    expect(puedeMover(admin, e("GANADO"), e("ENTREGADO"), etapas, conCotizacion).permitido).toBe(true);
  });

  it("no se mueve a una etapa desactivada", () => {
    const conInactiva = etapas.map((x) => (x.id === "INTERESADO" ? { ...x, activo: false } : x));
    expect(
      puedeMover(admin, e("CONTACTADO"), { ...e("INTERESADO"), activo: false }, conInactiva, sinCotizacion),
    ).toMatchObject({ permitido: false });
  });
});

describe("RN-22 y RN-26 cambios al mover", () => {
  const abierto = {
    etapaId: "INTERESADO",
    ganadoEn: null,
    entregadoEn: null,
    perdidoEn: null,
    motivoPerdidaId: null,
  };
  const ahora = new Date("2026-10-31T15:00:00Z");

  it("RN-22 perder exige motivo y lo guarda con la fecha", () => {
    expect(() => cambiosAlMover(abierto, e("PERDIDO"), ahora)).toThrow(ErrorMotivoPerdida);
    expect(cambiosAlMover(abierto, e("PERDIDO"), ahora, "precio")).toMatchObject({
      etapaId: "PERDIDO",
      perdidoEn: ahora,
      motivoPerdidaId: "precio",
    });
  });

  it("RN-22 reabrir borra la pérdida", () => {
    const perdido = { ...abierto, etapaId: "PERDIDO", perdidoEn: ahora, motivoPerdidaId: "precio" };
    expect(cambiosAlMover(perdido, e("INTERESADO"), ahora)).toMatchObject({
      perdidoEn: null,
      motivoPerdidaId: null,
    });
  });

  it("RN-26 entregar fija la fecha que suma a clientes asegurados y no la pisa después", () => {
    const antes = new Date("2026-09-01T00:00:00Z");
    expect(
      cambiosAlMover({ ...abierto, etapaId: "GANADO", ganadoEn: antes }, e("ENTREGADO"), ahora),
    ).toMatchObject({
      ganadoEn: antes,
      entregadoEn: ahora,
    });
  });

  it("reabrir vuelve a la última etapa abierta del historial", () => {
    const historial = [
      { etapaDestinoId: "PROSPECTO" },
      { etapaDestinoId: "DEMO_AGENDADA" },
      { etapaDestinoId: "PERDIDO" },
    ];
    expect(etapaParaReabrir(historial, etapas)?.id).toBe("DEMO_AGENDADA");
    expect(etapaParaReabrir([], etapas)?.id).toBe("PROSPECTO");
  });
});

describe("Etapas parametrizables", () => {
  it("la plantilla de CÓDIGO LENGUA es un embudo válido y nace en Prospecto", () => {
    expect(problemaDelEmbudo(etapas)).toBeNull();
    expect(etapaInicial(etapas)?.nombre).toBe("Prospecto");
  });

  it("rechaza un embudo sin límite, con dos límites o sin etapa de pérdida", () => {
    expect(problemaDelEmbudo(etapas.map((x) => ({ ...x, limiteAsesor: false })))).toMatch(/límite/);
    expect(
      problemaDelEmbudo(etapas.map((x) => ({ ...x, limiteAsesor: x.tipoSistema === "ABIERTA" }))),
    ).toMatch(/límite/);
    expect(problemaDelEmbudo(etapas.map((x) => (x.id === "PERDIDO" ? { ...x, activo: false } : x)))).toMatch(
      /perdida/,
    );
  });
});
