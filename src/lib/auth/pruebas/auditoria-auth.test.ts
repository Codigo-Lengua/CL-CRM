import { describe, expect, it } from "vitest";
import { registroDeAuditoria } from "../auditoria-auth";

describe("Auditoría de miembros e invitaciones", () => {
  it("el cambio de rol queda con el miembro y el rol nuevo", () => {
    const r = registroDeAuditoria(
      "/organization/update-member-role",
      { member: { id: "m1", organizationId: "o1", role: "SOCIO" } },
      null,
    );
    expect(r).toEqual({
      organizacionId: "o1",
      accion: "CAMBIAR_ROL",
      entidad: "member",
      entidadId: "m1",
      despues: { rol: "SOCIO" },
    });
  });

  it("la invitación se registra sin el correo del invitado", () => {
    const r = registroDeAuditoria(
      "/organization/invite-member",
      { id: "i1", organizationId: "o1", role: "ASESOR", email: "x@y.co" },
      null,
    );
    expect(r).toMatchObject({ accion: "INVITAR", entidadId: "i1", despues: { rol: "ASESOR" } });
    expect(JSON.stringify(r)).not.toContain("x@y.co");
  });

  it("usa la organización activa si la respuesta no la trae", () => {
    expect(registroDeAuditoria("/organization/cancel-invitation", { id: "i1" }, "o9")?.organizacionId).toBe(
      "o9",
    );
  });

  it("no audita otras rutas ni respuestas vacías o con error", () => {
    expect(registroDeAuditoria("/sign-in/email", { user: {} }, "o1")).toBeNull();
    expect(registroDeAuditoria("/organization/invite-member", null, "o1")).toBeNull();
    expect(registroDeAuditoria("/organization/invite-member", new Error("x"), "o1")).toBeNull();
  });
});
