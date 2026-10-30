import { type Rol, type RolPlataforma } from "./roles";

/** CL-CRM-03 §5: la verificación en dos pasos es obligatoria para ADMIN y superadministradores. */
export function exigeDosPasos(
  rolPlataforma: RolPlataforma | string | null | undefined,
  rol?: Rol | null,
): boolean {
  return rolPlataforma === "superadmin" || rol === "ADMIN";
}
