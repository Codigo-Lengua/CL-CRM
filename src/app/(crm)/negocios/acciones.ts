"use server";

import { revalidatePath } from "next/cache";
import { type z } from "zod";
import type { ContextoSesion } from "@/lib/auth/contexto-sesion";
import { conPermiso } from "@/lib/auth/sesion";
import { ErrorSinPermiso, puede } from "@/lib/permisos";
import { esquemaEtapas, esquemaNegocio } from "@/modules/embudo/aplicacion/esquemas";
import {
  type Actor,
  actualizarNegocio,
  crearNegocio,
  ErrorEmbudo,
  guardarEtapas,
  moverNegocio,
  reabrirNegocio,
} from "@/modules/embudo/aplicacion/negocios";
import { ErrorMotivoPerdida } from "@/modules/embudo/dominio/negocio";
import { actorDe } from "./sesion-embudo";

export type Resultado =
  | { ok: true; id?: string }
  | {
      ok: false;
      error: string;
      errores?: Record<string, string>;
      existente?: { id: string; nombre: string };
    };

function erroresDe(error: z.ZodError): Record<string, string> {
  const errores: Record<string, string> = {};
  for (const issue of error.issues) errores[String(issue.path[0] ?? "")] ??= issue.message;
  return errores;
}

/** Toda acción del embudo: exige negocios.mover, corre en la organización activa y traduce errores. */
async function ejecutar(
  fn: (actor: Actor, contexto: ContextoSesion) => Promise<Resultado>,
): Promise<Resultado> {
  try {
    return await conPermiso("negocios.mover", async (contexto) => {
      const actor = actorDe(contexto);
      if (!actor) throw new ErrorSinPermiso(contexto.rol, "negocios.mover");
      return fn(actor, contexto);
    });
  } catch (error) {
    if (error instanceof ErrorEmbudo || error instanceof ErrorMotivoPerdida)
      return { ok: false, error: error.message };
    if (error instanceof ErrorSinPermiso) return { ok: false, error: "Tu rol no puede hacer esto." };
    throw error;
  }
}

const datosDe = (formulario: FormData) => esquemaNegocio.safeParse(Object.fromEntries(formulario));

export async function crearNegocioAccion(empresaId: string, formulario: FormData): Promise<Resultado> {
  const datos = datosDe(formulario);
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  const r = await ejecutar(async (actor) => {
    const creado = await crearNegocio(actor, empresaId, datos.data);
    return creado.ok
      ? { ok: true, id: creado.id }
      : {
          ok: false,
          error: `La empresa ya tiene un negocio abierto: ${creado.existente.nombre}.`,
          existente: creado.existente,
        };
  });
  if (r.ok) revalidatePath(`/empresas/${empresaId}`);
  return r;
}

export async function actualizarNegocioAccion(id: string, formulario: FormData): Promise<Resultado> {
  const datos = datosDe(formulario);
  if (!datos.success)
    return { ok: false, error: "Revisa los campos marcados.", errores: erroresDe(datos.error) };
  const r = await ejecutar(async (actor) => {
    await actualizarNegocio(actor, id, datos.data);
    return { ok: true, id };
  });
  if (r.ok) revalidatePath(`/negocios/${id}`);
  return r;
}

export async function moverNegocioAccion(
  id: string,
  destinoId: string,
  motivoPerdidaId?: string,
  nota?: string,
): Promise<Resultado> {
  const r = await ejecutar(async (actor) => {
    await moverNegocio(actor, id, destinoId, { motivoPerdidaId, nota });
    return { ok: true, id };
  });
  if (r.ok) {
    revalidatePath(`/negocios/${id}`);
    revalidatePath("/negocios");
  }
  return r;
}

export async function reabrirNegocioAccion(id: string): Promise<Resultado> {
  const r = await ejecutar(async (actor) => {
    await reabrirNegocio(actor, id);
    return { ok: true, id };
  });
  if (r.ok) revalidatePath(`/negocios/${id}`);
  return r;
}

/** Solo la administración edita el embudo. */
export async function guardarEtapasAccion(lista: unknown): Promise<Resultado> {
  const datos = esquemaEtapas.safeParse(lista);
  if (!datos.success) return { ok: false, error: datos.error.issues[0]?.message ?? "Revisa las etapas." };
  const r = await ejecutar(async (_actor, contexto) => {
    if (!puede(contexto.rol, "configuracion.administrar"))
      return { ok: false, error: "Solo un administrador cambia las etapas del embudo." };
    await guardarEtapas(contexto.usuarioId, datos.data);
    return { ok: true };
  });
  if (r.ok) revalidatePath("/negocios");
  return r;
}
