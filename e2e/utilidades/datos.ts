import { readFileSync } from "node:fs";
import { join } from "node:path";

export interface DatosE2E {
  organizacion: string;
  admin: { email: string; contrasena: string };
  invitada: { email: string; nombre: string; contrasena: string };
}

export const RUTA_DATOS = join(__dirname, "..", ".datos.json");

export function leerDatos(): DatosE2E {
  return JSON.parse(readFileSync(RUTA_DATOS, "utf8")) as DatosE2E;
}
