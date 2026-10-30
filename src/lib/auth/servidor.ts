import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { admin, organization, twoFactor } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { registroDeAuditoria, seAudita } from "./auditoria-auth";
import { type ConfigAuth, leerConfigAuth } from "./config";
import { controlAcceso, rolesOrganizacion } from "./control-acceso";
import { type EnviadorCorreo, enviadorConsola, enviadorNoConfigurado } from "./correo";

export interface DependenciasAuth {
  config: ConfigAuth;
  correo: EnviadorCorreo;
}

const DIAS_INVITACION = 7;

/**
 * Fábrica de Better Auth (CL-CRM-03 §5). Recibe sus dependencias para poder probarla
 * con otro correo o configuración; la instancia de la aplicación sale de `obtenerAuth()`, abajo.
 *
 * - Better Auth usa el cliente sin aislamiento: sus tablas son de plataforma.
 * - No hay registro abierto: solo se crea una cuenta con una invitación pendiente.
 * - Al crear una organización o sumar un miembro se crean sus perfiles 1 a 1.
 */
export function crearAuth({ config, correo }: DependenciasAuth) {
  const plataforma = dbPlataforma();

  async function crearPerfilComercial(organizacionId: string, miembroId: string, usuarioId: string) {
    await conOrganizacion(organizacionId, () =>
      db().perfilComercial.upsert({
        where: { miembroId },
        create: { miembroId, usuarioId },
        update: {},
      }),
    );
  }

  return betterAuth({
    appName: config.nombreProducto,
    baseURL: config.urlBase,
    secret: config.secreto,
    trustedOrigins: [config.urlBase],
    database: prismaAdapter(plataforma, { provider: "postgresql" }),
    rateLimit: {
      enabled: config.limitarIntentos,
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
        "/two-factor/*": { window: 60, max: 5 },
        "/request-password-reset": { window: 300, max: 3 },
        "/reset-password": { window: 300, max: 5 },
      },
    },
    advanced: {
      database: { generateId: "uuid" },
      useSecureCookies: config.produccion,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: config.produccion },
    },
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 10,
      revokeSessionsOnPasswordReset: true,
      async sendResetPassword({ user, url }) {
        await correo.enviar({
          para: user.email,
          asunto: `Restablece tu contraseña de ${config.nombreProducto}`,
          texto: `Para crear una contraseña nueva abre este enlace (vence en una hora):\n${url}\n\nSi no lo pediste, ignora este correo.`,
        });
      },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 7,
      updateAge: 60 * 60 * 24,
    },
    hooks: {
      // Registro solo por invitación: el correo debe tener una invitación pendiente y vigente.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/sign-up/email") return;
        const email = String((ctx.body as { email?: unknown } | undefined)?.email ?? "").toLowerCase();
        const invitacion = await plataforma.invitation.findFirst({
          where: { email, status: "pending", expiresAt: { gt: new Date() } },
          select: { id: true },
        });
        if (!invitacion) {
          throw new APIError("FORBIDDEN", { message: "El registro es solo por invitación." });
        }
      }),
      // Cambios de miembros, roles e invitaciones quedan en la auditoría con quién los hizo.
      after: createAuthMiddleware(async (ctx) => {
        if (!seAudita(ctx.path)) return;
        const sesion = await getSessionFromCtx(ctx);
        const registro = registroDeAuditoria(
          ctx.path,
          ctx.context.returned,
          sesion?.session.activeOrganizationId,
        );
        if (!registro) return;
        const { organizacionId, ...datos } = registro;
        await conOrganizacion(organizacionId, () =>
          db().auditoria.create({
            data: { ...datos, despues: datos.despues ?? undefined, usuarioId: sesion?.user.id ?? null },
          }),
        );
      }),
    },
    databaseHooks: {
      session: {
        create: {
          // Al iniciar sesión, la organización activa es la primera a la que pertenece.
          async before(sesion) {
            if (sesion.activeOrganizationId) return;
            const miembro = await plataforma.member.findFirst({
              where: { userId: sesion.userId },
              orderBy: { createdAt: "asc" },
              select: { organizationId: true },
            });
            return { data: { ...sesion, activeOrganizationId: miembro?.organizationId ?? null } };
          },
        },
      },
    },
    plugins: [
      organization({
        ac: controlAcceso,
        roles: rolesOrganizacion,
        creatorRole: "ADMIN",
        // Las organizaciones las crea la plataforma (superadministrador o script), no los usuarios.
        allowUserToCreateOrganization: (usuario) => (usuario as { role?: string }).role === "superadmin",
        invitationExpiresIn: DIAS_INVITACION * 24 * 60 * 60,
        cancelPendingInvitationsOnReInvite: true,
        async sendInvitationEmail({ id, email, role, organization: org, inviter }) {
          const url = `${config.urlBase}/invitacion/${id}`;
          await correo.enviar({
            para: email,
            asunto: `${inviter.user.name} te invitó a ${org.name}`,
            texto: `Te invitaron a ${org.name} en ${config.nombreProducto} con el rol ${role}.\nAcepta la invitación aquí (vence en ${DIAS_INVITACION} días):\n${url}`,
          });
        },
        organizationHooks: {
          async afterCreateOrganization({ organization: org, member }) {
            await conOrganizacion(org.id, () => db().perfilOrganizacion.create({ data: {} }));
            await crearPerfilComercial(org.id, member.id, member.userId);
          },
          async afterAddMember({ member, organization: org }) {
            await crearPerfilComercial(org.id, member.id, member.userId);
          },
          async afterAcceptInvitation({ member, organization: org }) {
            await crearPerfilComercial(org.id, member.id, member.userId);
          },
        },
      }),
      twoFactor({
        issuer: config.nombreProducto,
        backupCodeOptions: { amount: 10 },
      }),
      admin({
        defaultRole: "user",
        adminRoles: ["superadmin"],
        roles: { user: userAc, superadmin: adminAc },
      }),
      // Debe ir de último: guarda las cookies cuando se llama desde server actions.
      nextCookies(),
    ],
  });
}

export type Auth = ReturnType<typeof crearAuth>;

const global = globalThis as unknown as { __auth?: Auth };

/**
 * Instancia de la aplicación (singleton). Se crea al primer uso y no al importar, para
 * que el build no exija las variables de entorno.
 */
export function obtenerAuth(): Auth {
  if (!global.__auth) {
    const config = leerConfigAuth();
    const correo = config.produccion ? enviadorNoConfigurado : enviadorConsola;
    global.__auth = crearAuth({ config, correo });
  }
  return global.__auth;
}
