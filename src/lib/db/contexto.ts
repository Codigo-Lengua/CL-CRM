import { AsyncLocalStorage } from "node:async_hooks";

interface ContextoOrganizacion {
  organizacionId: string;
}

const almacen = new AsyncLocalStorage<ContextoOrganizacion>();

/** Error de RN-02: se intentó leer o escribir datos de negocio sin organización activa. */
export class ErrorSinOrganizacion extends Error {
  constructor(modelo: string, operacion: string) {
    super(`RN-02: ${modelo}.${operacion} requiere una organización activa.`);
    this.name = "ErrorSinOrganizacion";
  }
}

/**
 * Ejecuta `fn` con una organización activa. Lo usan las server actions (desde la
 * sesión de Better Auth), los endpoints con clave de API y cada trabajo del worker.
 *
 * Espera el resultado dentro del contexto: las consultas de Prisma son perezosas y
 * se ejecutan al hacer `await`, así que deben resolverse antes de salir de él.
 */
export async function conOrganizacion<T>(organizacionId: string, fn: () => T | Promise<T>): Promise<T> {
  if (!organizacionId) throw new Error("conOrganizacion necesita un organizacionId.");
  return almacen.run({ organizacionId }, async () => await fn());
}

export function organizacionActual(): string | undefined {
  return almacen.getStore()?.organizacionId;
}
