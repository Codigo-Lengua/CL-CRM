import type { Prisma } from "@/generated/prisma/client";
import { db, dbPlataforma } from "@/lib/db";
import type { BuscadorDuplicados } from "../dominio/duplicados";

/** RN-07 sobre la organización activa (RN-02). `excluir` evita encontrarse a sí misma al editar. */
export function buscadorDuplicados(excluir?: string): BuscadorDuplicados {
  const noEsta = excluir ? { id: { not: excluir } } : {};
  const seleccion = { id: true, nombre: true } as const;
  const aCoincidencia = (e: { id: string; nombre: string } | null) =>
    e ? { empresaId: e.id, nombre: e.nombre } : null;
  return {
    porGooglePlaceId: async (googlePlaceId) =>
      aCoincidencia(await db().empresa.findFirst({ where: { googlePlaceId, ...noEsta }, select: seleccion })),
    porTelefonoEmpresa: async (telefonos) =>
      aCoincidencia(
        await db().empresa.findFirst({
          where: { telefonoE164: { in: telefonos }, suprimidaEn: null, ...noEsta },
          select: seleccion,
        }),
      ),
    porTelefonoContacto: async (telefonos) => {
      const contacto = await db().contacto.findFirst({
        where: {
          telefonoE164: { in: telefonos },
          suprimidoEn: null,
          ...(excluir ? { empresaId: { not: excluir } } : {}),
        },
        select: { empresa: { select: seleccion } },
      });
      return aCoincidencia(contacto?.empresa ?? null);
    },
  };
}

export async function auditar(registro: {
  usuarioId: string;
  accion: string;
  entidad: "empresa" | "contacto";
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

/** País de la organización activa, para normalizar teléfonos (RN-07). */
export async function paisActivo(): Promise<string> {
  const perfil = await db().perfilOrganizacion.findFirst({ select: { pais: true } });
  return perfil?.pais ?? "CO";
}

export interface Opcion {
  id: string;
  etiqueta: string;
}

/** Categorías, fuentes y equipo con que se llena el formulario de empresa. */
export async function opcionesEmpresa(organizacionId: string) {
  const [catalogo, miembros] = await Promise.all([
    db().valorCatalogo.findMany({
      where: { tipo: { in: ["CATEGORIA_EMPRESA", "FUENTE_LEAD"] }, activo: true },
      orderBy: { orden: "asc" },
      select: { id: true, etiqueta: true, tipo: true },
    }),
    dbPlataforma().member.findMany({
      where: { organizationId: organizacionId },
      select: { userId: true, user: { select: { name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);
  const de = (tipo: string): Opcion[] =>
    catalogo.filter((v) => v.tipo === tipo).map(({ id, etiqueta }) => ({ id, etiqueta }));
  return {
    categorias: de("CATEGORIA_EMPRESA"),
    fuentes: de("FUENTE_LEAD"),
    asesores: miembros.map((m): Opcion => ({ id: m.userId, etiqueta: m.user.name })),
  };
}

export type OpcionesEmpresa = Awaited<ReturnType<typeof opcionesEmpresa>>;
