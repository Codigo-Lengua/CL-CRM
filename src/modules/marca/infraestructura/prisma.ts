import { cache } from "react";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { completarMarca, type Marca, type MarcaGuardada } from "../dominio/marca";

/** Marca de la organización activa, completada con el tema por defecto. Una lectura por request. */
export const leerMarca = cache(async (): Promise<Marca> => {
  const perfil = await db().perfilOrganizacion.findFirst({ select: { marca: true } });
  return completarMarca(perfil?.marca);
});

export async function leerMarcaGuardada(): Promise<unknown> {
  const perfil = await db().perfilOrganizacion.findFirst({ select: { marca: true } });
  return perfil?.marca ?? null;
}

export async function guardarMarca(marca: MarcaGuardada): Promise<void> {
  await db().perfilOrganizacion.updateMany({ data: { marca: marca as Prisma.InputJsonValue } });
}
