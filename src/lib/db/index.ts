import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { extensionOrganizacion } from "./organizacion";

export { conOrganizacion, organizacionActual, ErrorSinOrganizacion } from "./contexto";
export { MODELOS_GLOBALES } from "./organizacion";

function crearCliente() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) }).$extends(extensionOrganizacion);
}

export type ClienteDb = ReturnType<typeof crearCliente>;

const global = globalThis as unknown as { __clienteDb?: ClienteDb };

/** Cliente único con aislamiento por organización (RN-02). En desarrollo sobrevive a la recarga. */
export function db(): ClienteDb {
  if (!global.__clienteDb) global.__clienteDb = crearCliente();
  return global.__clienteDb;
}

/**
 * Cliente sin aislamiento, solo para tareas de plataforma (seed, migraciones de datos,
 * superadministrador). Nunca se usa en pantallas ni endpoints de una organización.
 */
export function dbPlataforma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL.");
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}
