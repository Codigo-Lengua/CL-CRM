import { esRol, exigeDosPasos, type Rol } from "@/lib/permisos";

/** Quién está trabajando y en qué organización, ya verificado contra member. */
export interface ContextoSesion {
  usuarioId: string;
  nombre: string;
  email: string;
  organizacionId: string;
  miembroId: string;
  rol: Rol;
  rolPlataforma: string;
}

export type ResultadoSesion =
  | { estado: "sin-sesion" }
  | { estado: "sin-organizacion" }
  | { estado: "configurar-dos-pasos"; contexto: ContextoSesion }
  | { estado: "lista"; contexto: ContextoSesion };

export interface DatosSesion {
  usuario: {
    id: string;
    name: string;
    email: string;
    role?: string | null;
    twoFactorEnabled?: boolean | null;
  };
  organizacionActivaId: string | null | undefined;
}

export interface DatosMiembro {
  id: string;
  organizationId: string;
  userId: string;
  role: string;
}

/**
 * Decide si la sesión puede trabajar. La organización activa sale de la sesión, nunca de
 * un parámetro del cliente, y se confirma contra la membresía en cada request: si a la
 * persona la sacaron de la organización, la sesión deja de servir para ella.
 */
export function resolverSesion(sesion: DatosSesion | null, miembro: DatosMiembro | null): ResultadoSesion {
  if (!sesion) return { estado: "sin-sesion" };
  const { usuario, organizacionActivaId } = sesion;
  if (
    !organizacionActivaId ||
    !miembro ||
    miembro.userId !== usuario.id ||
    miembro.organizationId !== organizacionActivaId ||
    !esRol(miembro.role)
  ) {
    return { estado: "sin-organizacion" };
  }

  const contexto: ContextoSesion = {
    usuarioId: usuario.id,
    nombre: usuario.name,
    email: usuario.email,
    organizacionId: organizacionActivaId,
    miembroId: miembro.id,
    rol: miembro.role,
    rolPlataforma: usuario.role ?? "user",
  };

  if (exigeDosPasos(contexto.rolPlataforma, contexto.rol) && !usuario.twoFactorEnabled) {
    return { estado: "configurar-dos-pasos", contexto };
  }
  return { estado: "lista", contexto };
}
