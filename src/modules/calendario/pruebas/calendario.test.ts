import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Calendario } from "../dominio/calendario";
import { domingoDePascua, festivosColombia } from "../dominio/festivos-colombia";
import { calendarioCodigoLengua } from "../dominio/plantilla-codigo-lengua";

const calendario = new Calendario(calendarioCodigoLengua([2026, 2027]));

/** Instante a partir de una hora local de Bogotá (UTC-5, sin horario de verano). */
const bogota = (fechaHora: string) => new Date(`${fechaHora}:00-05:00`);

// Semana de referencia: lunes 9 de noviembre de 2026. El lunes 16 es festivo.
describe("RN-03 hora hábil", () => {
  it("RN-03 lunes dentro del horario es hábil", () => {
    expect(calendario.esHabil(bogota("2026-11-09T10:00"))).toBe(true);
  });

  it("RN-03 la apertura es hábil y el cierre no", () => {
    expect(calendario.esHabil(bogota("2026-11-09T08:00"))).toBe(true);
    expect(calendario.esHabil(bogota("2026-11-09T17:00"))).toBe(false);
  });

  it("RN-03 sábado solo hasta la 1:00 p. m.", () => {
    expect(calendario.esHabil(bogota("2026-11-14T12:59"))).toBe(true);
    expect(calendario.esHabil(bogota("2026-11-14T13:00"))).toBe(false);
  });

  it("RN-03 domingo y festivo no son hábiles", () => {
    expect(calendario.esHabil(bogota("2026-11-15T10:00"))).toBe(false);
    expect(calendario.esHabil(bogota("2026-11-16T10:00"))).toBe(false);
  });
});

describe("RN-04 y RN-05 ejemplos de CL-CRM-05 §4", () => {
  const casos = [
    { llegada: "2026-11-09T10:00", inicio: "2026-11-09T10:00", vence: "2026-11-09T10:10", porque: "dentro del horario" },
    { llegada: "2026-11-09T16:45", inicio: "2026-11-09T16:45", vence: "2026-11-09T16:55", porque: "faltan 15 minutos: no aplica el corte" },
    { llegada: "2026-11-09T16:52", inicio: "2026-11-10T08:00", vence: "2026-11-10T08:10", porque: "faltan 8 minutos: fuera de horario" },
    { llegada: "2026-11-13T18:30", inicio: "2026-11-14T08:00", vence: "2026-11-14T08:10", porque: "el sábado es hábil" },
    { llegada: "2026-11-07T12:55", inicio: "2026-11-09T08:00", vence: "2026-11-09T08:10", porque: "corte del sábado" },
    { llegada: "2026-11-14T12:55", inicio: "2026-11-17T08:00", vence: "2026-11-17T08:10", porque: "corte del sábado con lunes festivo" },
  ];

  for (const caso of casos) {
    it(`RN-04 ${caso.porque}`, () => {
      const inicio = calendario.inicioEfectivo(bogota(caso.llegada));
      expect(inicio).toEqual(bogota(caso.inicio));
      expect(calendario.sumarMinutosHabiles(inicio, 10)).toEqual(bogota(caso.vence));
    });
  }

  it("RN-04 con exactamente 10 minutos para el cierre no aplica el corte", () => {
    expect(calendario.inicioEfectivo(bogota("2026-11-09T16:50"))).toEqual(bogota("2026-11-09T16:50"));
  });

  it("RN-05 cruza al día hábil siguiente: 16:55 + 10 = martes 08:05", () => {
    expect(calendario.sumarMinutosHabiles(bogota("2026-11-09T16:55"), 10)).toEqual(bogota("2026-11-10T08:05"));
  });

  it("RN-05 D-19 el vencimiento puede caer justo en el cierre", () => {
    expect(calendario.sumarMinutosHabiles(bogota("2026-11-09T16:50"), 10)).toEqual(bogota("2026-11-09T17:00"));
  });

  it("RN-05 cambio de año salta el 1 de enero festivo", () => {
    // Jueves 31 de diciembre de 2026, 16:58 → viernes 1 de enero es festivo → sábado 2.
    expect(calendario.sumarMinutosHabiles(bogota("2026-12-31T16:58"), 10)).toEqual(bogota("2027-01-02T08:08"));
  });

  it("RN-05 sumar cero minutos en un momento inhábil lleva a la siguiente apertura", () => {
    expect(calendario.sumarMinutosHabiles(bogota("2026-11-15T10:00"), 0)).toEqual(bogota("2026-11-17T08:00"));
  });
});

describe("Minutos hábiles entre dos momentos", () => {
  it("cuenta solo los minutos dentro del horario", () => {
    expect(calendario.minutosHabilesEntre(bogota("2026-11-09T16:52"), bogota("2026-11-10T08:05"))).toBe(13);
  });
});

describe("Propiedades del reloj hábil", () => {
  const instante = fc
    .integer({ min: bogota("2026-01-01T00:00").getTime(), max: bogota("2027-12-01T00:00").getTime() })
    .map((ms) => new Date(ms));
  const minutos = fc.integer({ min: 0, max: 3_000 });

  it("RN-05 sumar minutos hábiles nunca devuelve una hora inhábil (salvo el cierre, D-19)", () => {
    fc.assert(
      fc.property(instante, minutos, (desde, n) => {
        const resultado = calendario.sumarMinutosHabiles(desde, n);
        const justoAntes = new Date(resultado.getTime() - 1);
        expect(calendario.esHabil(resultado) || calendario.esHabil(justoAntes)).toBe(true);
      }),
    );
  });

  it("RN-05 los minutos hábiles entre el inicio y el resultado son los sumados", () => {
    fc.assert(
      fc.property(instante, minutos, (desde, n) => {
        const resultado = calendario.sumarMinutosHabiles(desde, n);
        expect(calendario.minutosHabilesEntre(desde, resultado)).toBeCloseTo(n, 6);
      }),
    );
  });

  it("RN-04 el inicio efectivo es hábil y nunca anterior a la llegada", () => {
    fc.assert(
      fc.property(instante, (llegada) => {
        const inicio = calendario.inicioEfectivo(llegada);
        expect(calendario.esHabil(inicio)).toBe(true);
        expect(inicio.getTime()).toBeGreaterThanOrEqual(llegada.getTime());
      }),
    );
  });
});

describe("Validación del horario", () => {
  const base = { zonaHoraria: "America/Bogota", festivos: [], minutosCorteCierre: 10 };

  it("rechaza franjas traslapadas", () => {
    expect(
      () => new Calendario({ ...base, horario: { 1: [{ inicio: "08:00", fin: "12:00" }, { inicio: "11:00", fin: "17:00" }] } }),
    ).toThrow(/traslapadas/);
  });

  it("rechaza un horario sin ninguna franja al buscar la apertura", () => {
    expect(() => new Calendario({ ...base, horario: {} }).inicioEfectivo(new Date())).toThrow(/ninguna franja/);
  });

  it("franjas partidas: el corte antes del almuerzo pasa a la tarde", () => {
    const partido = new Calendario({
      ...base,
      horario: { 1: [{ inicio: "08:00", fin: "12:00" }, { inicio: "14:00", fin: "18:00" }] },
    });
    expect(partido.inicioEfectivo(bogota("2026-11-09T11:55"))).toEqual(bogota("2026-11-09T14:00"));
  });
});

describe("D-18 festivos de Colombia", () => {
  it("Pascua de 2026 y 2027", () => {
    expect(domingoDePascua(2026).toISOString().slice(0, 10)).toBe("2026-04-05");
    expect(domingoDePascua(2027).toISOString().slice(0, 10)).toBe("2027-03-28");
  });

  it("los 18 festivos de 2026", () => {
    expect(festivosColombia(2026)).toEqual([
      "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03", "2026-05-01",
      "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29", "2026-07-20", "2026-08-07",
      "2026-08-17", "2026-10-12", "2026-11-02", "2026-11-16", "2026-12-08", "2026-12-25",
    ]);
  });
});
