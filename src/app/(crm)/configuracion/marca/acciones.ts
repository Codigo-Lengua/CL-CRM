"use server";

import type { Prisma } from "@/generated/prisma/client";
import { conPermiso } from "@/lib/auth/sesion";
import { db } from "@/lib/db";
import { ErrorSinPermiso } from "@/lib/permisos";
import { completarMarca, esquemaMarcaGuardada } from "@/modules/marca/dominio/marca";
import { revisarContraste } from "@/modules/marca/dominio/tokens";
import { guardarMarca, leerMarcaGuardada } from "@/modules/marca/infraestructura/prisma";

export type Resultado = { ok: true } | { ok: false; error: string };

/** Guarda la marca de la organización activa si cumple contraste AA en ambos modos. */
export async function guardarMarcaOrganizacion(datos: unknown): Promise<Resultado> {
  const leida = esquemaMarcaGuardada.strict().safeParse(datos);
  if (!leida.success) return { ok: false, error: leida.error.issues[0]?.message ?? "Revisa los datos." };

  const problemas = revisarContraste(completarMarca(leida.data));
  if (problemas.length > 0) {
    const p = problemas[0]!;
    return {
      ok: false,
      error: `En modo ${p.modo}, ${p.nombre} tiene contraste ${p.contraste}:1 y se necesita ${p.minimo}:1.`,
    };
  }

  try {
    await conPermiso("configuracion.administrar", async (contexto) => {
      const antes = await leerMarcaGuardada();
      await guardarMarca(leida.data);
      await db().auditoria.create({
        data: {
          usuarioId: contexto.usuarioId,
          accion: "ACTUALIZAR",
          entidad: "marca",
          entidadId: contexto.organizacionId,
          antes: (antes ?? undefined) as Prisma.InputJsonValue | undefined,
          despues: leida.data as Prisma.InputJsonValue,
        },
      });
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorSinPermiso) {
      return { ok: false, error: "Solo un administrador puede cambiar la marca." };
    }
    throw error;
  }
}
