/** Roles comerciales de una membresía (member.role). CL-CRM-02 §11. */
export const ROLES = ["ADMIN", "SOCIO", "ASESOR"] as const;
export type Rol = (typeof ROLES)[number];

export const NOMBRE_ROL: Record<Rol, string> = { ADMIN: "Administrador", SOCIO: "Socio", ASESOR: "Asesor" };

export function esRol(valor: unknown): valor is Rol {
  return typeof valor === "string" && (ROLES as readonly string[]).includes(valor);
}

/** Rol de plataforma (user.role del plugin de administración). */
export const ROLES_PLATAFORMA = ["user", "superadmin"] as const;
export type RolPlataforma = (typeof ROLES_PLATAFORMA)[number];
