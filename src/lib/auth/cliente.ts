"use client";

import { adminClient, organizationClient, twoFactorClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { controlAcceso, rolesOrganizacion } from "./control-acceso";
import { navegarConRecarga } from "./navegacion";

/** Cliente de Better Auth para componentes de cliente. Usa el mismo origen de la app. */
export const authCliente = createAuthClient({
  plugins: [
    organizationClient({ ac: controlAcceso, roles: rolesOrganizacion }),
    twoFactorClient({
      onTwoFactorRedirect() {
        navegarConRecarga("/dos-pasos");
      },
    }),
    adminClient(),
  ],
});
