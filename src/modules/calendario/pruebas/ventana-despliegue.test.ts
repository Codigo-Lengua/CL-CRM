import { describe, expect, it } from "vitest";
import { revisarVentanaDespliegue } from "../dominio/ventana-despliegue";

const bogota = (fechaHora: string) => new Date(`${fechaHora}:00-05:00`);

describe("Ventana de despliegue", () => {
  it("permite un martes a las 6:00 p. m.", () => {
    expect(revisarVentanaDespliegue(bogota("2026-11-10T18:00")).permitido).toBe(true);
  });

  it("permite un jueves a las 7:30 a. m.", () => {
    expect(revisarVentanaDespliegue(bogota("2026-11-12T07:30")).permitido).toBe(true);
  });

  it("rechaza en horario de atención", () => {
    expect(revisarVentanaDespliegue(bogota("2026-11-10T10:00")).permitido).toBe(false);
  });

  it("rechaza viernes y fines de semana", () => {
    expect(revisarVentanaDespliegue(bogota("2026-11-13T19:00")).permitido).toBe(false);
    expect(revisarVentanaDespliegue(bogota("2026-11-14T19:00")).permitido).toBe(false);
    expect(revisarVentanaDespliegue(bogota("2026-11-15T19:00")).permitido).toBe(false);
  });

  it("rechaza festivos", () => {
    expect(revisarVentanaDespliegue(bogota("2026-11-16T19:00")).motivo).toMatch(/festivo/);
  });

  it("rechaza los días 4 y 5 de liquidación", () => {
    // Miércoles 4 y jueves 5 de noviembre de 2026.
    expect(revisarVentanaDespliegue(bogota("2026-11-04T19:00")).permitido).toBe(false);
    expect(revisarVentanaDespliegue(bogota("2026-11-05T19:00")).permitido).toBe(false);
  });
});
