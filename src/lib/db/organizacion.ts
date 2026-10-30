import { Prisma } from "@/generated/prisma/client";
import { ErrorSinOrganizacion, organizacionActual } from "./contexto";

/**
 * Modelos sin organizacionId: los administra la plataforma, no una organización.
 * Toda tabla nueva que no esté aquí debe tener organizacionId; una prueba lo verifica.
 */
export const MODELOS_GLOBALES: ReadonlySet<string> = new Set(["Organization"]);

/**
 * Modelos que solo usa la plataforma (Better Auth: usuarios, sesiones, cuentas, miembros,
 * invitaciones). No tienen organizacionId y el cliente aislado los rechaza: se leen y
 * escriben con dbPlataforma(), nunca con db(), para que ninguna organización vea usuarios
 * o tokens de sesión ajenos.
 */
export const MODELOS_PLATAFORMA: ReadonlySet<string> = new Set<string>([]);

/**
 * La organización es global pero tiene relaciones con todas las tablas de negocio: sin
 * filtro, un `include` o una escritura anidada desde ella saltaría el aislamiento. Con el
 * cliente aislado solo se ve y se modifica la organización activa; crearla o borrarla es
 * tarea de plataforma (Better Auth o dbPlataforma).
 */
const MODELO_ORGANIZACION = "Organization";

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
 *
 * Los `include`, `select` y escrituras anidadas tampoco pasan por aquí: los protege que
 * toda relación entre tablas de negocio incluya organizacionId en la llave foránea
 * (prueba "RN-02 esquema"), así un registro solo puede apuntar a otro de su organización.
 */
export const extensionOrganizacion = Prisma.defineExtension({
  name: "organizacion",
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (MODELOS_PLATAFORMA.has(model)) {
          throw new Error(`RN-02: ${model} solo se usa con dbPlataforma().`);
        }
        if (MODELOS_GLOBALES.has(model) && model !== MODELO_ORGANIZACION) return query(args);

        const organizacionId = organizacionActual();
        if (!organizacionId) throw new ErrorSinOrganizacion(model, operation);

        const a = (args ?? {}) as Datos;

        if (model === MODELO_ORGANIZACION) {
          if (!LECTURAS_Y_FILTROS.has(operation) || operation.startsWith("delete")) {
            throw new Error(`RN-02: ${model}.${operation} solo se permite desde la plataforma.`);
          }
          // En AND y no sobrescrito: pedir otra organización por id debe dar vacío, no la propia.
          a.where = { id: organizacionId, AND: [(a.where as Datos | undefined) ?? {}] };
          if (a.data && (a.data as Datos).id !== undefined && (a.data as Datos).id !== organizacionId) {
            throw new Error(`RN-02: ${model} no puede cambiar de id.`);
          }
          return query(a as typeof args);
        }

        if (LECTURAS_Y_FILTROS.has(operation)) {
          a.where = { ...((a.where as Datos | undefined) ?? {}), organizacionId };
          if (a.data && operation.startsWith("update")) {
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
