import { describe, expect, it } from "vitest";
import { Calendario } from "@/modules/calendario/dominio/calendario";
import { calendarioCodigoLengua } from "@/modules/calendario/dominio/plantilla-codigo-lengua";
import { calcularVencimiento } from "../dominio/vencimiento";

const calendario = new Calendario(calendarioCodigoLengua([2026]));
const bogota = (fechaHora: string) => new Date(`${fechaHora}:00-05:00`);

describe("RN-14 vencimiento del SLA (con D-01)", () => {
  it("RN-14 asignación inicial aplica el corte: 16:52 vence martes 08:10", () => {
    const vence = calcularVencimiento(calendario, {
      asignadaEn: bogota("2026-11-09T16:52"),
      nivelEscalamiento: 0,
      minutosSla: 10,
    });
    expect(vence).toEqual(bogota("2026-11-10T08:10"));
  });

  it("RN-14 escalamiento sin corte: tarea de las 16:45 escalada a las 16:55 vence martes 08:05", () => {
    const venceInicial = calcularVencimiento(calendario, {
      asignadaEn: bogota("2026-11-09T16:45"),
      nivelEscalamiento: 0,
      minutosSla: 10,
    });
    expect(venceInicial).toEqual(bogota("2026-11-09T16:55"));

    const venceEscalada = calcularVencimiento(calendario, {
      asignadaEn: venceInicial,
      nivelEscalamiento: 1,
      minutosSla: 10,
    });
    expect(venceEscalada).toEqual(bogota("2026-11-10T08:05"));
  });

  it("RN-14 lead fuera de horario vence a la apertura más 10 minutos", () => {
    const vence = calcularVencimiento(calendario, {
      asignadaEn: bogota("2026-11-15T21:00"),
      nivelEscalamiento: 0,
      minutosSla: 10,
    });
    expect(vence).toEqual(bogota("2026-11-17T08:10"));
  });
});
