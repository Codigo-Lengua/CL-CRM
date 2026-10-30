import { Prisma } from "@/generated/prisma/client";
import { ErrorSinOrganizacion, organizacionActual } from "./contexto";

/**
 * Modelos sin organizacionId: los administra la plataforma, no una organización.
 * Toda tabla nueva que no esté aquí debe tener organizacionId; una prueba lo verifica.
 */
export const MODELOS_GLOBALES: ReadonlySet<string> = new Set(["Organization"]);

const LECTURAS_Y_FILTROS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "updateManyAndReturn",
  "delete",
  "deleteMany",
]);

type Datos = Record<string, unknown>;

function asignarOrganizacion(datos: Datos, organizacionId: string, modelo: string): Datos {
  const indicada = datos.organizacionId;
  if (indicada !== undefined && indicada !== organizacionId) {
    throw new Error(`RN-02: ${modelo} no puede escribirse en otra organización.`);
  }
  return { ...datos, organizacionId };
}

/**
 * RN-02: toda consulta filtra y toda escritura asigna la organización activa.
 * Sin organización activa, la operación falla. Las consultas con $queryRaw o
 * $executeRaw no pasan por aquí y deben filtrar a mano.
 */
export const extensionOrganizacion = Prisma.defineExtension({
  name: "organizacion",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (MODELOS_GLOBALES.has(model)) return query(args);

        const organizacionId = organizacionActual();
        if (!organizacionId) throw new ErrorSinOrganizacion(model, operation);

        const a = (args ?? {}) as Datos;

        if (LECTURAS_Y_FILTROS.has(operation)) {
          a.where = { ...((a.where as Datos | undefined) ?? {}), organizacionId };
          if (a.data && (operation.startsWith("update"))) {
            a.data = asignarOrganizacion(a.data as Datos, organizacionId, model);
          }
        } else if (operation === "create") {
          a.data = asignarOrganizacion(a.data as Datos, organizacionId, model);
        } else if (operation === "createMany" || operation === "createManyAndReturn") {
          const datos = Array.isArray(a.data) ? a.data : [a.data];
          a.data = (datos as Datos[]).map((d) => asignarOrganizacion(d, organizacionId, model));
        } else if (operation === "upsert") {
          a.where = { ...(a.where as Datos), organizacionId };
          a.create = asignarOrganizacion(a.create as Datos, organizacionId, model);
          a.update = asignarOrganizacion(a.update as Datos, organizacionId, model);
        } else {
          throw new Error(`RN-02: operación ${operation} no contemplada en el aislamiento.`);
        }

        return query(a as typeof args);
      },
    },
  },
});
