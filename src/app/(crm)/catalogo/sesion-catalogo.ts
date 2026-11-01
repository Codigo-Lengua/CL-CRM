import type { ContextoSesion } from "@/lib/auth/contexto-sesion";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion } from "@/lib/db";
import { puede } from "@/lib/permisos";

export interface Acceso {
  /** Solo la administración edita el catálogo. */
  edita: boolean;
  /** costos.ver: administración y socios. */
  verCostos: boolean;
}

/** Todo el equipo consulta el catálogo para cotizar; lo que cambia es qué edita y qué ve. */
export async function enCatalogo<T>(fn: (acceso: Acceso, contexto: ContextoSesion) => Promise<T>) {
  const contexto = await exigirSesion();
  const acceso = {
    edita: puede(contexto.rol, "configuracion.administrar"),
    verCostos: puede(contexto.rol, "costos.ver"),
  };
  const valor = await conOrganizacion(contexto.organizacionId, () => fn(acceso, contexto));
  return { acceso, valor };
}
