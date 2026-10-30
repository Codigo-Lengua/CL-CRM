import type { Calendario } from "@/modules/calendario/dominio/calendario";

export interface DatosVencimiento {
  /** Momento en que la tarea quedó a cargo del responsable actual (TAREA.asignada_en). */
  asignadaEn: Date;
  /** 0 = asignación inicial; 1 a 3 = escalamiento (TAREA.nivel_escalamiento). */
  nivelEscalamiento: number;
  /** Parámetro minutos_sla_primer_contacto. */
  minutosSla: number;
}

/**
 * RN-14 con la corrección D-01: el corte antes del cierre solo aplica a la
 * asignación inicial. Al escalar, el reloj sigue desde asignada_en sin corte.
 */
export function calcularVencimiento(calendario: Calendario, datos: DatosVencimiento): Date {
  const inicio =
    datos.nivelEscalamiento === 0 ? calendario.inicioEfectivo(datos.asignadaEn) : datos.asignadaEn;
  return calendario.sumarMinutosHabiles(inicio, datos.minutosSla);
}
