import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { conOrganizacion, dbPlataforma } from "@/lib/db";
import { type Alcance, exigir, type Permiso } from "@/lib/permisos";
import { type ContextoSesion, resolverSesion, type ResultadoSesion } from "./contexto-sesion";
import { obtenerAuth } from "./servidor";

/** Lee la sesión de la request y la confirma contra la membresía. Solo en el servidor. */
export async function leerSesion(): Promise<ResultadoSesion> {
  // headers() primero: marca la página como dinámica antes de tocar la configuración.
  const cabeceras = await headers();
  const sesion = await obtenerAuth().api.getSession({ headers: cabeceras });
  if (!sesion) return resolverSesion(null, null);

  const organizacionActivaId = sesion.session.activeOrganizationId;
  const miembro = organizacionActivaId
    ? await dbPlataforma().member.findUnique({
        where: { organizationId_userId: { organizationId: organizacionActivaId, userId: sesion.user.id } },
      })
    : null;

  return resolverSesion({ usuario: sesion.user, organizacionActivaId }, miembro);
}

/** Para páginas: devuelve el contexto o redirige a donde corresponda. */
export async function exigirSesion(): Promise<ContextoSesion> {
  const resultado = await leerSesion();
  switch (resultado.estado) {
    case "sin-sesion":
      redirect("/ingresar");
    case "sin-organizacion":
      redirect("/sin-organizacion");
    case "configurar-dos-pasos":
      redirect("/dos-pasos/configurar");
    case "lista":
      return resultado.contexto;
  }
}

/**
 * Envoltura de toda server action y endpoint del CRM: verifica sesión y permiso por sí
 * misma (el proxy de Next no basta) y ejecuta `fn` con la organización activa (RN-02).
 */
export async function conPermiso<T>(
  permiso: Permiso,
  fn: (contexto: ContextoSesion, alcance: Alcance) => Promise<T>,
): Promise<T> {
  const contexto = await exigirSesion();
  const alcance = exigir(contexto.rol, permiso);
  return conOrganizacion(contexto.organizacionId, () => fn(contexto, alcance));
}
