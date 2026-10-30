/**
 * Qué acciones de Better Auth quedan en la auditoría (CL-CRM-04 §4.8) y cómo se leen.
 * Sin datos personales: se guarda el id del registro y el rol, nunca el correo.
 */
export interface RegistroAuditoria {
  organizacionId: string;
  accion: string;
  entidad: "member" | "invitation";
  entidadId: string | null;
  despues: { rol: string } | null;
}

type Obj = Record<string, unknown>;

const obj = (v: unknown): Obj => (v && typeof v === "object" ? (v as Obj) : {});
const texto = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

const ACCIONES: Record<string, { accion: string; entidad: RegistroAuditoria["entidad"] }> = {
  "/organization/update-member-role": { accion: "CAMBIAR_ROL", entidad: "member" },
  "/organization/remove-member": { accion: "QUITAR_MIEMBRO", entidad: "member" },
  "/organization/invite-member": { accion: "INVITAR", entidad: "invitation" },
  "/organization/cancel-invitation": { accion: "CANCELAR_INVITACION", entidad: "invitation" },
  "/organization/accept-invitation": { accion: "ACEPTAR_INVITACION", entidad: "member" },
};

export function seAudita(ruta: string | undefined): boolean {
  return !!ruta && ruta in ACCIONES;
}

/** Devuelve el registro a guardar, o null si la ruta no se audita o la respuesta no sirve. */
export function registroDeAuditoria(
  ruta: string | undefined,
  devuelto: unknown,
  organizacionActiva: string | null | undefined,
): RegistroAuditoria | null {
  const definicion = ruta ? ACCIONES[ruta] : undefined;
  if (!definicion || !devuelto || devuelto instanceof Error) return null;

  const r = obj(devuelto);
  // Unas rutas devuelven el registro directo y otras lo envuelven ({ member }, { invitation }).
  const registro = definicion.entidad === "member" ? obj(r.member ?? r) : obj(r.invitation ?? r);
  const organizacionId = texto(registro.organizationId) ?? texto(organizacionActiva);
  if (!organizacionId) return null;

  const rol = texto(registro.role);
  return {
    organizacionId,
    accion: definicion.accion,
    entidad: definicion.entidad,
    entidadId: texto(registro.id),
    despues: rol ? { rol } : null,
  };
}
