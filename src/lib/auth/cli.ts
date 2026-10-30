// Punto de entrada para el CLI de Better Auth, que busca un export llamado `auth`:
//   npx auth generate --config src/lib/auth/cli.ts --output prisma/schema/auth.prisma
import { leerConfigAuth } from "./config";
import { enviadorConsola } from "./correo";
import { crearAuth } from "./servidor";

export const auth = crearAuth({ config: leerConfigAuth(), correo: enviadorConsola });
