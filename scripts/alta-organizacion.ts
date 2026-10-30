// Crea una organización con su primer ADMIN (tarea de plataforma, no pasa por invitación).
// Uso:
//   npm run alta-organizacion -- --nombre "CÓDIGO LENGUA" --slug codigo-lengua \
//     --admin-nombre "Arlez Cerón" --admin-email arlez@ejemplo.co [--superadmin]
// La contraseña se lee de la variable CONTRASENA_ADMIN para que no quede en el historial.
import "dotenv/config";
import { parseArgs } from "node:util";
import { darDeAltaOrganizacion } from "../src/lib/auth/alta-organizacion";
import { leerConfigAuth } from "../src/lib/auth/config";
import { enviadorConsola } from "../src/lib/auth/correo";
import { crearAuth } from "../src/lib/auth/servidor";

const { values } = parseArgs({
  options: {
    nombre: { type: "string" },
    slug: { type: "string" },
    "admin-nombre": { type: "string" },
    "admin-email": { type: "string" },
    superadmin: { type: "boolean", default: false },
  },
});

const contrasena = process.env.CONTRASENA_ADMIN;
const faltan = ["nombre", "slug", "admin-nombre", "admin-email"].filter(
  (k) => !values[k as keyof typeof values],
);
if (faltan.length || !contrasena) {
  console.error(
    `Faltan: ${[...faltan.map((f) => `--${f}`), ...(contrasena ? [] : ["CONTRASENA_ADMIN"])].join(", ")}`,
  );
  process.exit(1);
}

async function principal(contrasena: string) {
  const auth = crearAuth({ config: leerConfigAuth(), correo: enviadorConsola });
  const resultado = await darDeAltaOrganizacion(auth, {
    organizacion: { nombre: values.nombre!, slug: values.slug! },
    administrador: {
      nombre: values["admin-nombre"]!,
      email: values["admin-email"]!,
      contrasena,
      superadministrador: values.superadmin,
    },
  });
  console.log(`Organización ${resultado.organizacionId} creada con su ADMIN ${resultado.usuarioId}.`);
  console.log("Al primer ingreso se le pedirá activar la verificación en dos pasos.");
}

principal(contrasena).then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
