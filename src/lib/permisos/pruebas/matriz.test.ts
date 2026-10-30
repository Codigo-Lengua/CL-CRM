import { describe, expect, it } from "vitest";
import { alcance, ErrorSinPermiso, exigeDosPasos, exigir, PERMISOS, puede, ROLES } from "..";

describe("Permisos por rol (CL-CRM-02 §11)", () => {
  it("ADMIN tiene todos los permisos", () => {
    for (const p of PERMISOS) expect(puede("ADMIN", p)).toBe(true);
  });

  it("SOCIO no administra configuración, no exporta, no aprueba devoluciones ni crea integraciones", () => {
    const negados = PERMISOS.filter((p) => !puede("SOCIO", p));
    expect(negados.sort()).toEqual(
      [
        "configuracion.administrar",
        "datos.exportar",
        "devoluciones.aprobar",
        "integraciones.administrar",
      ].sort(),
    );
  });

  it("ASESOR solo ve las empresas asignadas y sus propias comisiones", () => {
    expect(alcance("ASESOR", "empresas.ver_editar")).toBe("asignados");
    expect(alcance("ASESOR", "comisiones.ver")).toBe("propios");
  });

  it("ASESOR pide descuentos que quedan pendientes y no los aprueba", () => {
    expect(alcance("ASESOR", "descuentos.solicitar")).toBe("pendiente");
    expect(puede("ASESOR", "descuentos.aprobar")).toBe(false);
  });

  it("ASESOR no ve costos, no reasigna leads ni registra pagos", () => {
    expect(puede("ASESOR", "costos.ver")).toBe(false);
    expect(puede("ASESOR", "leads.reasignar")).toBe(false);
    expect(puede("ASESOR", "pagos.registrar")).toBe(false);
  });

  it("todos los roles cambian solo su propia disponibilidad", () => {
    for (const r of ROLES) expect(alcance(r, "disponibilidad.cambiar")).toBe("propios");
  });

  it("exigir lanza ErrorSinPermiso cuando falta el permiso", () => {
    expect(() => exigir("ASESOR", "datos.exportar")).toThrow(ErrorSinPermiso);
    expect(exigir("SOCIO", "costos.ver")).toBe("todos");
  });
});

describe("Verificación en dos pasos (CL-CRM-03 §5)", () => {
  it("es obligatoria para ADMIN y superadministrador", () => {
    expect(exigeDosPasos("user", "ADMIN")).toBe(true);
    expect(exigeDosPasos("superadmin", null)).toBe(true);
  });

  it("es opcional para SOCIO y ASESOR", () => {
    expect(exigeDosPasos("user", "SOCIO")).toBe(false);
    expect(exigeDosPasos("user", "ASESOR")).toBe(false);
  });
});
