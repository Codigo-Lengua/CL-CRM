"use server";

import { revalidatePath } from "next/cache";
import { type z } from "zod";
import type { ContextoSesion } from "@/lib/auth/contexto-sesion";
import { conPermiso } from "@/lib/auth/sesion";
import { type Alcance, ErrorSinPermiso, puede } from "@/lib/permisos";
import {
  type Actor,
  actualizarEmpresa,
  agregarContacto,
  cambiarNoContactar,
  crearEmpresa,
  ErrorEmpresaNoVisible,
  type ResultadoEscritura,
  suprimirDatosPersonales,
} from "@/modules/empresas/aplicacion/empresas";
import { esquemaContacto, esquemaEmpresa } from "@/modules/empresas/aplicacion/esquemas";
import { DESCRIPCION_MOTIVO } from "@/modules/empresas/dominio/duplicados";
import { paisActivo } from "@/modules/empresas/infraestructura/prisma";

export type Resultado =
  | { ok: true; id: string }
  | {
      ok: false;
      error: string;
      errores?: Record<string, string>;
      duplicado?: { empresaId: string; nombre: string };
    };

const CASILLAS = ["aceptaWhatsapp", "esPrincipal", "autorizo"];

/** Un FormData a objeto plano; las casillas marcadas llegan como "on". */
function aObjeto(formulario: FormData): Record<string, unknown> {
  const datos: Record<string, unknown> = Object.fromEntries(formulario);
  for (const casilla of CASILLAS) datos[casilla] = formulario.get(casilla) === "on";
  return datos;
}

function erroresDe(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? "");
    errores[campo] ??= issue.message;
  }
  return errores;
}

function desdeEscritura(r: ResultadoEscritura): Resultado {
  if (r.ok) return r;
  return {
    ok: false,
    error: `Ya existe: ${r.duplicado.nombre} (${DESCRIPCION_MOTIVO[r.duplicado.motivo]}).`,
    duplicado: { empresaId: r.duplicado.empresaId, nombre: r.duplicado.nombre },
  };
}

/**
 * Toda acción de empresas: exige empresas.ver_editar con su alcance (el asesor solo toca
 * sus asignadas), corre en la organización activa (RN-02) y traduce los errores esperados.
 */
async function ejecutar(
  fn: (actor: Actor, contexto: ContextoSesion, alcance: Alcance) => Promise<Resultado>,
): Promise<Resultado> {
  try {
    return await conPermiso("empresas.ver_editar", async (contexto, alcance) =>
      fn({ usuarioId: contexto.usuarioId, alcance, pais: await paisActivo() }, contexto, alcance),
    );
  } catch (error) {
    if (error instanceof ErrorEmpresaNoVisible) return { ok: false, error: error.message };
    if (error instanceof ErrorSinPermiso) return { ok: false, error: "Tu rol no puede hacer esto." };
    throw error;
  }
}

export async function crearEmpresaAccion(formulario: FormData): Promise<Resultado> {
  const datos = esquemaEmpresa.safeParse(aObjeto(formulario));
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  const resultado = await ejecutar(async (actor) => desdeEscritura(await crearEmpresa(actor, datos.data)));
  if (resultado.ok) revalidatePath("/empresas");
  return resultado;
}

export async function actualizarEmpresaAccion(id: string, formulario: FormData): Promise<Resultado> {
  const datos = esquemaEmpresa.safeParse(aObjeto(formulario));
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  const resultado = await ejecutar(async (actor) =>
    desdeEscritura(await actualizarEmpresa(actor, id, datos.data)),
  );
  if (resultado.ok) revalidatePath(`/empresas/${id}`);
  return resultado;
}

export async function agregarContactoAccion(empresaId: string, formulario: FormData): Promise<Resultado> {
  const datos = esquemaContacto.safeParse(aObjeto(formulario));
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  const resultado = await ejecutar(async (actor) =>
    desdeEscritura(await agregarContacto(actor, empresaId, datos.data)),
  );
  if (resultado.ok) revalidatePath(`/empresas/${empresaId}`);
  return resultado;
}

export async function cambiarNoContactarAccion(id: string, noContactar: boolean): Promise<Resultado> {
  const resultado = await ejecutar(async (actor) => {
    await cambiarNoContactar(actor, id, noContactar);
    return { ok: true, id };
  });
  if (resultado.ok) revalidatePath(`/empresas/${id}`);
  return resultado;
}

/** RN-47: solo la administración suprime datos personales. */
export async function suprimirAccion(id: string): Promise<Resultado> {
  const resultado = await ejecutar(async (actor, contexto) => {
    if (!puede(contexto.rol, "configuracion.administrar")) {
      return { ok: false, error: "Solo un administrador puede suprimir datos personales." };
    }
    await suprimirDatosPersonales(actor, id);
    return { ok: true, id };
  });
  if (resultado.ok) revalidatePath(`/empresas/${id}`);
  return resultado;
}
