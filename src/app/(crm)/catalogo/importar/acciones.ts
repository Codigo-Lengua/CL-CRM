"use server";

import { revalidatePath } from "next/cache";
import { conPermiso } from "@/lib/auth/sesion";
import { ErrorSinPermiso } from "@/lib/permisos";
import { ErrorCatalogo } from "@/modules/catalogo/aplicacion/catalogo";
import { importarCatalogo, revisarImportacion } from "@/modules/catalogo/aplicacion/importacion";
import type { PlanImportacion } from "@/modules/catalogo/dominio/importacion/plan";

export type Revision = { ok: true; formato: string; plan: PlanImportacion } | { ok: false; error: string };

export type Importacion = { ok: true; resumen: PlanImportacion["resumen"] } | { ok: false; error: string };

async function archivoDe(formulario: FormData) {
  const archivo = formulario.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) throw new ErrorCatalogo("Elige un archivo.");
  return { nombre: archivo.name, bytes: new Uint8Array(await archivo.arrayBuffer()) };
}

function comoError(error: unknown) {
  if (error instanceof ErrorCatalogo) return { ok: false as const, error: error.message };
  if (error instanceof ErrorSinPermiso)
    return { ok: false as const, error: "Solo un administrador importa el catálogo." };
  throw error;
}

/** Paso 1: lee el archivo y muestra qué haría, sin guardar nada. */
export async function revisarArchivoAccion(formulario: FormData): Promise<Revision> {
  try {
    return await conPermiso("configuracion.administrar", async () => {
      const { nombre, bytes } = await archivoDe(formulario);
      return { ok: true as const, ...(await revisarImportacion(nombre, bytes)) };
    });
  } catch (error) {
    return comoError(error);
  }
}

/** Paso 2: importa el mismo archivo, todo o nada. */
export async function importarArchivoAccion(formulario: FormData): Promise<Importacion> {
  try {
    const resumen = await conPermiso("configuracion.administrar", async (contexto) => {
      const { nombre, bytes } = await archivoDe(formulario);
      return importarCatalogo(contexto.usuarioId, nombre, bytes);
    });
    revalidatePath("/catalogo");
    return { ok: true, resumen };
  } catch (error) {
    return comoError(error);
  }
}
