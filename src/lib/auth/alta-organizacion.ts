import { type Auth } from "./servidor";

export interface DatosAltaOrganizacion {
  organizacion: { nombre: string; slug: string };
  administrador: { nombre: string; email: string; contrasena: string; superadministrador?: boolean };
}

/**
 * Crea una organización con su primer ADMIN. Es una tarea de plataforma: no pasa por el
 * registro por invitación y solo se llama desde el servidor (script o superadministrador).
 * Los perfiles 1 a 1 los crean los hooks de la organización.
 */
export async function darDeAltaOrganizacion(auth: Auth, datos: DatosAltaOrganizacion) {
  const { administrador, organizacion } = datos;
  const { user } = await auth.api.createUser({
    body: {
      name: administrador.nombre,
      email: administrador.email.toLowerCase(),
      password: administrador.contrasena,
      role: administrador.superadministrador ? "superadmin" : "user",
    },
  });
  const org = await auth.api.createOrganization({
    body: { name: organizacion.nombre, slug: organizacion.slug, userId: user.id },
  });
  if (!org) throw new Error(`No se pudo crear la organización ${organizacion.slug}.`);
  return { usuarioId: user.id, organizacionId: org.id };
}
