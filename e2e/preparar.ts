// Crea una organización nueva con su ADMIN para cada corrida, así las pruebas no
// dependen de datos previos ni chocan entre sí. Usa el mismo script que en producción;
// corre con tsx porque el cliente de Prisma es ESM y Playwright carga CommonJS.
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { writeFileSync } from "node:fs";
import { type DatosE2E, RUTA_DATOS } from "./utilidades/datos";

export default function preparar() {
  const sufijo = randomUUID().slice(0, 8);
  const datos: DatosE2E = {
    organizacion: `E2E ${sufijo}`,
    admin: { email: `admin-${sufijo}@e2e.co`, contrasena: `clave-admin-${sufijo}` },
    invitada: {
      email: `asesora-${sufijo}@e2e.co`,
      nombre: "Laura Asesora",
      contrasena: `clave-asesora-${sufijo}`,
    },
  };
  execFileSync(
    "npx",
    [
      "tsx",
      "scripts/alta-organizacion.ts",
      ...["--nombre", datos.organizacion, "--slug", `e2e-${sufijo}`],
      ...["--admin-nombre", "Admin E2E", "--admin-email", datos.admin.email],
    ],
    { stdio: "inherit", env: { ...process.env, CONTRASENA_ADMIN: datos.admin.contrasena } },
  );
  writeFileSync(RUTA_DATOS, JSON.stringify(datos, null, 2));
}
