import type { ConfiguracionCalendario } from "@/modules/calendario/dominio/calendario";
import { type FechaCivil, festivosColombia } from "@/modules/calendario/dominio/festivos-colombia";
import type { Parametros } from "./parametros";

export interface DatosOrganizacionCalendario {
  pais: string;
  zonaHoraria: string;
  /** Festivos propios de la organización (tabla FESTIVO). */
  festivosPropios: FechaCivil[];
}

/**
 * Arma el calendario de la organización activa a partir de sus parámetros (RN-01):
 * horario y corte de CONFIGURACION, festivos nacionales calculados (D-18) y propios.
 */
export async function configuracionCalendario(
  parametros: Parametros,
  organizacion: DatosOrganizacionCalendario,
  anios: number[],
): Promise<ConfiguracionCalendario> {
  const { horario_atencion, minutos_corte_cierre } = await parametros.obtenerVarios([
    "horario_atencion",
    "minutos_corte_cierre",
  ]);
  const nacionales = organizacion.pais === "CO" ? anios.flatMap(festivosColombia) : [];
  return {
    zonaHoraria: organizacion.zonaHoraria,
    horario: horario_atencion,
    festivos: [...nacionales, ...organizacion.festivosPropios],
    minutosCorteCierre: minutos_corte_cierre,
  };
}
