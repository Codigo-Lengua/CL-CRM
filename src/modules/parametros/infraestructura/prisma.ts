import { db, organizacionActual } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { Parametros } from "../aplicacion/parametros";
import { DEFINICIONES, esClave } from "../dominio/definiciones";
import { type Plantilla, PLANTILLA_CODIGO_LENGUA, type TipoCatalogo } from "../dominio/plantilla";

const global = globalThis as unknown as { __parametros?: Parametros };

/** Servicio único de parámetros, leído de CONFIGURACION con el cliente aislado (RN-02). */
export function parametros(): Parametros {
  global.__parametros ??= new Parametros(() =>
    db().configuracion.findMany({ select: { clave: true, valor: true } }),
  );
  return global.__parametros;
}

/**
 * Copia la plantilla a la organización activa. Es idempotente: no toca lo que ya existe,
 * así que también sirve para completar organizaciones creadas antes de una clave nueva.
 */
export async function aplicarPlantilla(plantilla: Plantilla = PLANTILLA_CODIGO_LENGUA): Promise<void> {
  const organizacionId = organizacionActual();
  if (!organizacionId) throw new Error("RN-02: aplicarPlantilla requiere una organización activa.");
  const cliente = db();
  const configuracion = Object.entries(plantilla.configuracion).flatMap(([clave, valor]) => {
    if (!esClave(clave)) return [];
    const { tipo, descripcion, editablePor } = DEFINICIONES[clave];
    return [{ clave, valor: valor as Prisma.InputJsonValue, tipo, descripcion, editablePor }];
  });
  const catalogos = Object.entries(plantilla.catalogos).flatMap(([tipo, valores]) =>
    valores.map((v, i) => ({
      tipo: tipo as TipoCatalogo,
      codigo: v.codigo,
      etiqueta: v.etiqueta,
      orden: (i + 1) * 10,
      esSistema: v.esSistema ?? false,
      atributos: v.atributos as Prisma.InputJsonValue | undefined,
    })),
  );
  const canales = plantilla.canales.map((c, i) => ({ ...c, prioridad: i + 1 }));

  // La extensión de organización asigna organizacionId a cada fila.
  await cliente.configuracion.createMany({ data: configuracion, skipDuplicates: true });
  await cliente.valorCatalogo.createMany({ data: catalogos, skipDuplicates: true });
  await cliente.canalEnvio.createMany({ data: canales, skipDuplicates: true });
  parametros().invalidar(organizacionId);
}
