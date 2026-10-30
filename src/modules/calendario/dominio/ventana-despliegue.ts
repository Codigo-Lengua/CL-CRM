import { TZDate } from "@date-fns/tz";
import { festivosColombia } from "./festivos-colombia";

export interface ResultadoVentana {
  permitido: boolean;
  motivo: string;
}

const ZONA = "America/Bogota";
const APERTURA = 8 * 60;
const CIERRE = 17 * 60;
/** Días de liquidación de comisiones (dia_liquidacion y el anterior). */
const DIAS_CONGELADOS = [4, 5];

/**
 * Ventana de despliegue a producción (docs/flujo-de-trabajo.md §7):
 * lunes a jueves, fuera del horario de atención, sin festivos ni días de liquidación.
 */
export function revisarVentanaDespliegue(instante: Date): ResultadoVentana {
  const local = new TZDate(instante.getTime(), ZONA);
  const fecha = [
    local.getFullYear(),
    String(local.getMonth() + 1).padStart(2, "0"),
    String(local.getDate()).padStart(2, "0"),
  ].join("-");
  const dia = local.getDay(); // 0 domingo … 6 sábado
  const minuto = local.getHours() * 60 + local.getMinutes();

  if (dia === 0 || dia >= 5) return { permitido: false, motivo: "Solo se despliega de lunes a jueves." };
  if (festivosColombia(local.getFullYear()).includes(fecha)) {
    return { permitido: false, motivo: `El ${fecha} es festivo.` };
  }
  if (DIAS_CONGELADOS.includes(local.getDate())) {
    return { permitido: false, motivo: "Los días 4 y 5 están congelados por la liquidación." };
  }
  if (minuto >= APERTURA && minuto < CIERRE) {
    return { permitido: false, motivo: "Dentro del horario de atención (8:00 a 17:00)." };
  }
  return { permitido: true, motivo: "Dentro de la ventana de despliegue." };
}
