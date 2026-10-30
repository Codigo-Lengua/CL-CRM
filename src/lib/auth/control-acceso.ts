import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/organization/access";

/**
 * Roles del plugin de organización (member.role). Solo cubren lo que hace Better Auth:
 * administrar la organización, sus miembros e invitaciones. Los permisos del CRM
 * se resuelven en src/lib/permisos a partir del mismo rol.
 */
const declaraciones = {
  organization: defaultStatements.organization,
  member: defaultStatements.member,
  invitation: defaultStatements.invitation,
} as const;

export const controlAcceso = createAccessControl(declaraciones);

export const rolesOrganizacion = {
  ADMIN: controlAcceso.newRole({
    organization: ["update"],
    member: ["create", "update", "delete"],
    invitation: ["create", "cancel"],
  }),
  SOCIO: controlAcceso.newRole({ organization: [], member: [], invitation: [] }),
  ASESOR: controlAcceso.newRole({ organization: [], member: [], invitation: [] }),
};
