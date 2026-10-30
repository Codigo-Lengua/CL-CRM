import { describe, expect, it } from "vitest";
import { type DatosMiembro, type DatosSesion, resolverSesion } from "../contexto-sesion";

const usuario = { id: "u1", name: "Natalia", email: "n@cl.co", role: "user", twoFactorEnabled: false };
const sesion = (cambios: Partial<DatosSesion> = {}): DatosSesion => ({
  usuario,
  organizacionActivaId: "org1",
  ...cambios,
});
const miembro = (cambios: Partial<DatosMiembro> = {}): DatosMiembro => ({
  id: "m1",
  organizationId: "org1",
  userId: "u1",
  role: "ASESOR",
  ...cambios,
});

describe("Sesión y organización activa", () => {
  it("sin sesión pide ingresar", () => {
    expect(resolverSesion(null, null).estado).toBe("sin-sesion");
  });

  it("RN-02 sin organización activa no puede trabajar", () => {
    expect(resolverSesion(sesion({ organizacionActivaId: null }), null).estado).toBe("sin-organizacion");
  });

  it("RN-02 la organización activa debe coincidir con una membresía del mismo usuario", () => {
    expect(resolverSesion(sesion(), null).estado).toBe("sin-organizacion");
    expect(resolverSesion(sesion(), miembro({ organizationId: "org2" })).estado).toBe("sin-organizacion");
    expect(resolverSesion(sesion(), miembro({ userId: "u2" })).estado).toBe("sin-organizacion");
  });

  it("un rol desconocido no da acceso", () => {
    expect(resolverSesion(sesion(), miembro({ role: "member" })).estado).toBe("sin-organizacion");
  });

  it("ASESOR sin dos pasos entra", () => {
    const r = resolverSesion(sesion(), miembro());
    expect(r).toMatchObject({
      estado: "lista",
      contexto: { rol: "ASESOR", organizacionId: "org1", miembroId: "m1" },
    });
  });

  it("ADMIN sin dos pasos debe configurarlo antes de trabajar", () => {
    expect(resolverSesion(sesion(), miembro({ role: "ADMIN" })).estado).toBe("configurar-dos-pasos");
  });

  it("ADMIN con dos pasos entra", () => {
    const s = sesion({ usuario: { ...usuario, twoFactorEnabled: true } });
    expect(resolverSesion(s, miembro({ role: "ADMIN" })).estado).toBe("lista");
  });

  it("superadministrador sin dos pasos debe configurarlo aunque sea SOCIO", () => {
    const s = sesion({ usuario: { ...usuario, role: "superadmin" } });
    expect(resolverSesion(s, miembro({ role: "SOCIO" })).estado).toBe("configurar-dos-pasos");
  });
});
