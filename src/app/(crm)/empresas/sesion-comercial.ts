import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion } from "@/lib/db";
import { alcance as alcanceDe } from "@/lib/permisos";
import type { Actor } from "@/modules/empresas/aplicacion/empresas";
import { paisActivo } from "@/modules/empresas/infraestructura/prisma";
import type { ContextoSesion } from "@/lib/auth/contexto-sesion";

/**
 * Para las páginas de empresas: resuelve la sesión y, si el rol tiene empresas.ver_editar,
 * ejecuta `fn` en la organización activa con el actor (RN-02). Sin permiso devuelve null.
 */
export async function comoActor<T>(
  fn: (actor: Actor, contexto: ContextoSesion) => Promise<T>,
): Promise<{ contexto: ContextoSesion; valor: T } | null> {
  const contexto = await exigirSesion();
  const alcance = alcanceDe(contexto.rol, "empresas.ver_editar");
  if (!alcance) return null;
  const valor = await conOrganizacion(contexto.organizacionId, async () =>
    fn({ usuarioId: contexto.usuarioId, alcance, pais: await paisActivo() }, contexto),
  );
  return { contexto, valor };
}
