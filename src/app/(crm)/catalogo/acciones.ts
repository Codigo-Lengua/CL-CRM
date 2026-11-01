"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { conPermiso } from "@/lib/auth/sesion";
import { ErrorSinPermiso } from "@/lib/permisos";
import {
  agregarCosto,
  agregarPrecio,
  asignarImpuestos,
  eliminarCosto,
  ErrorCatalogo,
  guardarImpuesto,
  guardarPlan,
  guardarServicio,
} from "@/modules/catalogo/aplicacion/catalogo";
import {
  esquemaCosto,
  esquemaImpuesto,
  esquemaPlan,
  esquemaPrecio,
  esquemaServicio,
} from "@/modules/catalogo/aplicacion/esquemas";

const sinDatos = z.object({});

export type Resultado =
  { ok: true; id?: string } | { ok: false; error: string; errores?: Record<string, string> };

function erroresDe(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) errores[String(issue.path[0] ?? "")] ??= issue.message;
  return errores;
}

const CASILLAS = ["visibleWeb", "requiereCotizacionManual", "activo", "incluidoEnPrecio"];

function aObjeto(formulario: FormData) {
  const datos: Record<string, unknown> = Object.fromEntries(formulario);
  for (const c of CASILLAS) datos[c] = formulario.get(c) === "on";
  return datos;
}

/** Solo la administración edita el catálogo (CL-CRM-02 §9); todo queda en la auditoría. */
async function comoAdministrador<T>(
  esquema: z.ZodType<T>,
  entrada: unknown,
  fn: (usuarioId: string, datos: T) => Promise<string | void>,
  rutas: string[],
): Promise<Resultado> {
  const datos = esquema.safeParse(entrada);
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  try {
    const id = await conPermiso("configuracion.administrar", (contexto) =>
      fn(contexto.usuarioId, datos.data),
    );
    for (const ruta of rutas) revalidatePath(ruta);
    return { ok: true, id: id ?? undefined };
  } catch (error) {
    if (error instanceof ErrorCatalogo) return { ok: false, error: error.message };
    if (error instanceof ErrorSinPermiso)
      return { ok: false, error: "Solo un administrador edita el catálogo." };
    throw error;
  }
}

export async function guardarServicioAccion(id: string | null, formulario: FormData) {
  return comoAdministrador(
    esquemaServicio,
    aObjeto(formulario),
    (usuarioId, datos) => guardarServicio(usuarioId, datos, id ?? undefined),
    ["/catalogo", ...(id ? [`/catalogo/${id}`] : [])],
  );
}

export async function guardarPlanAccion(servicioId: string, formulario: FormData) {
  return comoAdministrador(
    esquemaPlan,
    aObjeto(formulario),
    (usuarioId, datos) => guardarPlan(usuarioId, servicioId, datos),
    [`/catalogo/${servicioId}`],
  );
}

export async function agregarPrecioAccion(servicioId: string, formulario: FormData) {
  return comoAdministrador(
    esquemaPrecio,
    Object.fromEntries(formulario),
    (usuarioId, datos) => agregarPrecio(usuarioId, servicioId, datos),
    ["/catalogo", `/catalogo/${servicioId}`],
  );
}

export async function agregarCostoAccion(servicioId: string, formulario: FormData) {
  return comoAdministrador(
    esquemaCosto,
    Object.fromEntries(formulario),
    (usuarioId, datos) => agregarCosto(usuarioId, servicioId, datos),
    [`/catalogo/${servicioId}`],
  );
}

export async function eliminarCostoAccion(servicioId: string, costoId: string) {
  return comoAdministrador(sinDatos, {}, (usuarioId) => eliminarCosto(usuarioId, costoId), [
    `/catalogo/${servicioId}`,
  ]);
}

export async function asignarImpuestosAccion(servicioId: string, formulario: FormData) {
  const ids = formulario.getAll("impuesto").map(String);
  return comoAdministrador(sinDatos, {}, (usuarioId) => asignarImpuestos(usuarioId, servicioId, ids), [
    `/catalogo/${servicioId}`,
  ]);
}

export async function guardarImpuestoAccion(id: string | null, formulario: FormData) {
  return comoAdministrador(
    esquemaImpuesto,
    aObjeto(formulario),
    (usuarioId, datos) => guardarImpuesto(usuarioId, datos, id ?? undefined),
    ["/catalogo/impuestos"],
  );
}
