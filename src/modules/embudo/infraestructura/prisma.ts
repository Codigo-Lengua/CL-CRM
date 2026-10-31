import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { Etapa } from "../dominio/etapas";
import { ETAPAS_POR_DEFECTO } from "../dominio/etapas";

/** Siembra el embudo por defecto si la organización activa no tiene etapas. Es idempotente. */
export async function asegurarEtapas(): Promise<void> {
  if ((await db().etapaEmbudo.count()) > 0) return;
  await db().etapaEmbudo.createMany({ data: [...ETAPAS_POR_DEFECTO], skipDuplicates: true });
}

export async function leerEtapas(): Promise<Etapa[]> {
  await asegurarEtapas();
  return db().etapaEmbudo.findMany({
    orderBy: { orden: "asc" },
    select: {
      id: true,
      nombre: true,
      orden: true,
      tipoSistema: true,
      limiteAsesor: true,
      probabilidad: true,
      activo: true,
    },
  });
}

/**
 * RN-23: ¿el negocio tiene una cotización aceptada? Las cotizaciones llegan con #14; hasta
 * entonces ningún negocio la tiene y por eso nadie lo pasa a ganado a mano.
 */
export function tieneCotizacionAceptada(_negocioId: string): Promise<boolean> {
  return Promise.resolve(false);
}

/** Motivos de pérdida que se eligen a mano: DEVOLUCION es del sistema (RN-24). */
export async function motivosDePerdida() {
  return db().valorCatalogo.findMany({
    where: { tipo: "MOTIVO_PERDIDA", activo: true, esSistema: false },
    orderBy: { orden: "asc" },
    select: { id: true, etiqueta: true },
  });
}

export async function auditar(registro: {
  usuarioId: string;
  accion: string;
  entidad: "negocio" | "etapa_embudo";
  entidadId: string;
  antes?: unknown;
  despues?: unknown;
}) {
  await db().auditoria.create({
    data: {
      ...registro,
      antes: (registro.antes ?? undefined) as Prisma.InputJsonValue | undefined,
      despues: (registro.despues ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

/** Moneda de la organización activa, para mostrar valores. */
export async function monedaActiva(): Promise<string> {
  const perfil = await db().perfilOrganizacion.findFirst({ select: { moneda: true } });
  return perfil?.moneda ?? "COP";
}
