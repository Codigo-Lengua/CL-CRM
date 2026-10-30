import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { darDeAltaOrganizacion } from "../alta-organizacion";
import { type MensajeCorreo } from "../correo";
import { crearAuth } from "../servidor";

// Prueba de integración: necesita PostgreSQL con las migraciones aplicadas (npm run test:integracion).
const correos: MensajeCorreo[] = [];
const auth = crearAuth({
  config: {
    urlBase: "http://localhost:3000",
    secreto: "secreto-de-prueba-de-al-menos-32-caracteres",
    nombreProducto: "CRM de prueba",
    produccion: false,
    limitarIntentos: false,
  },
  correo: {
    enviar: (m) => {
      correos.push(m);
      return Promise.resolve();
    },
  },
});

const plataforma = dbPlataforma();
const sufijo = randomUUID().slice(0, 8);
const correoAdmin = `admin-${sufijo}@prueba.co`;
const correoAsesor = `asesor-${sufijo}@prueba.co`;
const contrasena = "contrasena-segura-123";
let organizacionId = "";
let adminId = "";

async function ingresar(email: string): Promise<Headers> {
  const { headers } = await auth.api.signInEmail({
    body: { email, password: contrasena },
    returnHeaders: true,
  });
  const cookie = headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie });
}

beforeAll(async () => {
  ({ organizacionId, usuarioId: adminId } = await darDeAltaOrganizacion(auth, {
    organizacion: { nombre: "Organización de prueba", slug: `prueba-${sufijo}` },
    administrador: { nombre: "Admin", email: correoAdmin, contrasena },
  }));
});

afterAll(async () => {
  await plataforma.auditoria.deleteMany({ where: { organizacionId } });
  await plataforma.perfilComercial.deleteMany({ where: { organizacionId } });
  await plataforma.perfilOrganizacion.deleteMany({ where: { organizacionId } });
  await plataforma.organization.deleteMany({ where: { id: organizacionId } });
  await plataforma.user.deleteMany({ where: { email: { in: [correoAdmin, correoAsesor] } } });
});

describe("Better Auth: organizaciones, invitaciones y perfiles", () => {
  it("el alta crea la organización con su ADMIN y los perfiles 1 a 1", async () => {
    const miembro = await plataforma.member.findFirstOrThrow({ where: { organizationId: organizacionId } });
    expect(miembro).toMatchObject({ userId: adminId, role: "ADMIN" });

    const perfiles = await conOrganizacion(organizacionId, async () => ({
      organizacion: await db().perfilOrganizacion.findFirst(),
      comercial: await db().perfilComercial.findUnique({ where: { miembroId: miembro.id } }),
    }));
    expect(perfiles.organizacion).toMatchObject({ pais: "CO", zonaHoraria: "America/Bogota", moneda: "COP" });
    expect(perfiles.comercial).toMatchObject({ usuarioId: adminId, disponibilidad: "FUERA_DE_TURNO" });
  });

  it("el registro sin invitación se rechaza", async () => {
    await expect(
      auth.api.signUpEmail({
        body: { email: `intruso-${sufijo}@prueba.co`, password: contrasena, name: "X" },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("al iniciar sesión la organización activa es la de su membresía", async () => {
    const headers = await ingresar(correoAdmin);
    const sesion = await auth.api.getSession({ headers });
    expect(sesion?.session.activeOrganizationId).toBe(organizacionId);
  });

  it("un ADMIN invita, el invitado se registra, acepta y queda como ASESOR con su perfil", async () => {
    const headersAdmin = await ingresar(correoAdmin);
    const invitacion = await auth.api.createInvitation({
      headers: headersAdmin,
      body: { email: correoAsesor, role: "ASESOR", organizationId: organizacionId },
    });
    expect(correos.at(-1)).toMatchObject({ para: correoAsesor });
    expect(correos.at(-1)?.texto).toContain(`/invitacion/${invitacion.id}`);

    await auth.api.signUpEmail({ body: { email: correoAsesor, password: contrasena, name: "Asesor" } });
    const headersAsesor = await ingresar(correoAsesor);
    await auth.api.acceptInvitation({ headers: headersAsesor, body: { invitationId: invitacion.id } });

    const miembro = await plataforma.member.findFirstOrThrow({
      where: { organizationId: organizacionId, user: { email: correoAsesor } },
    });
    expect(miembro.role).toBe("ASESOR");
    const perfil = await conOrganizacion(organizacionId, () =>
      db().perfilComercial.findUnique({ where: { miembroId: miembro.id } }),
    );
    expect(perfil).not.toBeNull();

    // De un solo uso: aceptarla otra vez falla.
    await expect(
      auth.api.acceptInvitation({ headers: headersAsesor, body: { invitationId: invitacion.id } }),
    ).rejects.toBeDefined();
  });

  it("el ADMIN cambia el rol y queda en la auditoría con quién lo hizo", async () => {
    const headersAdmin = await ingresar(correoAdmin);
    const miembro = await plataforma.member.findFirstOrThrow({
      where: { organizationId: organizacionId, user: { email: correoAsesor } },
    });
    await auth.api.updateMemberRole({
      headers: headersAdmin,
      body: { memberId: miembro.id, role: "SOCIO", organizationId: organizacionId },
    });
    const registros = await conOrganizacion(organizacionId, () =>
      db().auditoria.findMany({ where: { entidadId: miembro.id }, orderBy: { ocurridoEn: "asc" } }),
    );
    expect(registros.map((r) => r.accion)).toEqual(["ACEPTAR_INVITACION", "CAMBIAR_ROL"]);
    expect(registros.at(-1)).toMatchObject({ usuarioId: adminId, despues: { rol: "SOCIO" } });

    await auth.api.updateMemberRole({
      headers: headersAdmin,
      body: { memberId: miembro.id, role: "ASESOR", organizationId: organizacionId },
    });
  });

  it("un ASESOR no puede invitar", async () => {
    const headersAsesor = await ingresar(correoAsesor);
    await expect(
      auth.api.createInvitation({
        headers: headersAsesor,
        body: { email: `otro-${sufijo}@prueba.co`, role: "ASESOR", organizationId: organizacionId },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("un usuario normal no puede crear organizaciones", async () => {
    const headersAsesor = await ingresar(correoAsesor);
    await expect(
      auth.api.createOrganization({
        headers: headersAsesor,
        body: { name: "Propia", slug: `propia-${sufijo}` },
      }),
    ).rejects.toMatchObject({ statusCode: 403 });
  });

  it("los modelos de Better Auth no se pueden leer con el cliente aislado", async () => {
    await expect(conOrganizacion(organizacionId, () => db().user.findMany())).rejects.toThrow(/dbPlataforma/);
    await expect(conOrganizacion(organizacionId, () => db().session.findMany())).rejects.toThrow(
      /dbPlataforma/,
    );
  });
});
