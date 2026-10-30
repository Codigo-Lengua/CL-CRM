import type { ConfiguracionCalendario } from "./calendario";
import { festivosColombia } from "./festivos-colombia";

/**
 * Valores de CÓDIGO LENGUA (CL-CRM-04 §5). En producción se leen de
 * CONFIGURACION con Parametros.obtener (RN-01); aquí sirven para el seed y
 * las pruebas.
 */
export function calendarioCodigoLengua(anios: number[]): ConfiguracionCalendario {
  const semana = [{ inicio: "08:00", fin: "17:00" }];
  return {
    zonaHoraria: "America/Bogota",
    horario: { 1: semana, 2: semana, 3: semana, 4: semana, 5: semana, 6: [{ inicio: "08:00", fin: "13:00" }] },
    festivos: anios.flatMap(festivosColombia),
    minutosCorteCierre: 10,
  };
}
