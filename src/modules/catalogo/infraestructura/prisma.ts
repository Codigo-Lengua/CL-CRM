import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { ImpuestoAplicable } from "../dominio/impuestos";
import type { PrecioConVigencia } from "../dominio/precios";
import { type Dia, diaDe } from "../dominio/vigencia";

/** Hoy en la zona horaria de la organización activa: la vigencia es por día de calendario. */
export async function hoyEnOrganizacion(ahora = new Date()): Promise<Dia> {
  const perfil = await db().perfilOrganizacion.findFirst({ select: { zonaHoraria: true } });
  return new Intl.DateTimeFormat("en-CA", { timeZone: perfil?.zonaHoraria ?? "America/Bogota" }).format(
    ahora,
  );
}

export const aFecha = (dia: Dia) => new Date(`${dia}T00:00:00Z`);

export function aPrecio(p: {
  id: string;
  valor: Prisma.Decimal;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
}) {
  return {
    id: p.id,
    valor: Number(p.valor),
    desde: diaDe(p.vigenteDesde),
    hasta: p.vigenteHasta ? diaDe(p.vigenteHasta) : null,
  } satisfies PrecioConVigencia;
}

export function aImpuesto(i: {
  codigo: string;
  nombre: string;
  tipo: "TRASLADADO" | "RETENIDO";
  porcentaje: Prisma.Decimal;
  incluidoEnPrecio: boolean;
  activo: boolean;
  vigenteDesde: Date;
  vigenteHasta: Date | null;
}): ImpuestoAplicable {
  return {
    codigo: i.codigo,
    nombre: i.nombre,
    tipo: i.tipo,
    porcentaje: Number(i.porcentaje),
    incluidoEnPrecio: i.incluidoEnPrecio,
    activo: i.activo,
    desde: diaDe(i.vigenteDesde),
    hasta: i.vigenteHasta ? diaDe(i.vigenteHasta) : null,
  };
}

/** La base de datos rechazó un traslape de vigencias (restricción de exclusión, RN-27). */
export function esTraslape(error: unknown): boolean {
  const texto = String((error as { message?: string })?.message ?? "");
  return texto.includes("precio_servicio_sin_traslape") || texto.includes("precio_plan_sin_traslape");
}

export const esCodigoRepetido = (error: unknown) =>
  error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";

export async function auditar(registro: {
  usuarioId: string;
  accion: string;
  entidad: "servicio" | "plan" | "precio" | "costo_terceros" | "impuesto";
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
