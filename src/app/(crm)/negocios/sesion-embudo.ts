import type { ContextoSesion } from "@/lib/auth/contexto-sesion";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion } from "@/lib/db";
import { alcance as alcanceDe } from "@/lib/permisos";
import type { Actor } from "@/modules/embudo/aplicacion/negocios";

/** Alcance de negocios.mover como actor del embudo; null si el rol no lo tiene. */
export function actorDe(contexto: ContextoSesion): Actor | null {
  const alcance = alcanceDe(contexto.rol, "negocios.mover");
  if (alcance !== "todos" && alcance !== "asignados") return null;
  return { usuarioId: contexto.usuarioId, alcance };
}

/** Para las páginas del embudo: sesión, permiso y organización activa (RN-02). */
export async function comoActorEmbudo<T>(
  fn: (actor: Actor, contexto: ContextoSesion) => Promise<T>,
): Promise<{ contexto: ContextoSesion; valor: T } | null> {
  const contexto = await exigirSesion();
  const actor = actorDe(contexto);
  if (!actor) return null;
  const valor = await conOrganizacion(contexto.organizacionId, () => fn(actor, contexto));
  return { contexto, valor };
}
