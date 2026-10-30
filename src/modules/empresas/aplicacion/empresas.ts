import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import type { Alcance } from "@/lib/permisos";
import { buscarDuplicado, type Coincidencia } from "../dominio/duplicados";
import { datosSuprimidosContacto, datosSuprimidosEmpresa, enmascarar } from "../dominio/supresion";
import { normalizarTelefono } from "../dominio/telefono";
import { auditar, buscadorDuplicados } from "../infraestructura/prisma";
import type { DatosContacto, DatosEmpresa } from "./esquemas";

/** Quién actúa: usuario, alcance del permiso empresas.ver_editar y país de la organización. */
export interface Actor {
  usuarioId: string;
  alcance: Alcance;
  pais: string;
}

export type ResultadoEscritura = { ok: true; id: string } | { ok: false; duplicado: Coincidencia };

/** El asesor solo ve las empresas que tiene asignadas (CL-CRM-02 §11). */
export function filtroVisibles(actor: Actor): Prisma.EmpresaWhereInput {
  return actor.alcance === "todos" ? {} : { asesorId: actor.usuarioId };
}

export class ErrorEmpresaNoVisible extends Error {
  constructor() {
    super("Esa empresa no existe o no la tienes asignada.");
    this.name = "ErrorEmpresaNoVisible";
  }
}

async function exigirVisible(actor: Actor, id: string) {
  const empresa = await db().empresa.findFirst({ where: { id, ...filtroVisibles(actor) } });
  if (!empresa) throw new ErrorEmpresaNoVisible();
  return empresa;
}

/** Datos personales enmascarados para la auditoría (#48). */
function resumenAuditable(e: {
  nombre?: string | null;
  telefono?: string | null;
  correo?: string | null;
  whatsapp?: string | null;
}) {
  return {
    nombre: e.nombre,
    telefono: enmascarar(e.telefono),
    whatsapp: enmascarar(e.whatsapp),
    correo: enmascarar(e.correo),
  };
}

export interface FiltrosLista {
  q?: string;
  categoriaId?: string;
  asesorId?: string;
  pagina?: number;
}

export const TAMANO_PAGINA = 25;

export async function listarEmpresas(actor: Actor, filtros: FiltrosLista) {
  const q = filtros.q?.trim();
  const telefono = q ? normalizarTelefono(q, actor.pais) : null;
  const where: Prisma.EmpresaWhereInput = {
    ...filtroVisibles(actor),
    ...(filtros.categoriaId ? { categoriaId: filtros.categoriaId } : {}),
    ...(filtros.asesorId && actor.alcance === "todos"
      ? { asesorId: filtros.asesorId === "sin-asignar" ? null : filtros.asesorId }
      : {}),
    ...(q
      ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            ...(telefono
              ? [{ telefonoE164: telefono }, { contactos: { some: { telefonoE164: telefono } } }]
              : []),
            { contactos: { some: { nombre: { contains: q, mode: "insensitive" } } } },
          ],
        }
      : {}),
  };
  const pagina = Math.max(1, filtros.pagina ?? 1);
  const [total, empresas] = await Promise.all([
    db().empresa.count({ where }),
    db().empresa.findMany({
      where,
      orderBy: { actualizadoEn: "desc" },
      skip: (pagina - 1) * TAMANO_PAGINA,
      take: TAMANO_PAGINA,
      select: {
        id: true,
        nombre: true,
        ciudad: true,
        telefono: true,
        asesorId: true,
        noContactar: true,
        suprimidaEn: true,
        origenDato: true,
        aceptaWhatsapp: true,
        actualizadoEn: true,
        categoria: { select: { etiqueta: true } },
        _count: { select: { contactos: true } },
      },
    }),
  ]);
  return { total, pagina, empresas };
}

export async function obtenerEmpresa(actor: Actor, id: string) {
  return db().empresa.findFirst({
    where: { id, ...filtroVisibles(actor) },
    include: {
      categoria: { select: { id: true, etiqueta: true } },
      fuente: { select: { id: true, etiqueta: true } },
      contactos: { orderBy: [{ esPrincipal: "desc" }, { creadoEn: "asc" }] },
    },
  });
}

function camposEmpresa(datos: DatosEmpresa, pais: string) {
  const { asesorId: _asesor, ...resto } = datos;
  return {
    ...resto,
    telefonoE164: normalizarTelefono(datos.telefono, pais) ?? normalizarTelefono(datos.whatsapp, pais),
  };
}

function telefonosDe(datos: DatosEmpresa, pais: string): string[] {
  return [normalizarTelefono(datos.telefono, pais), normalizarTelefono(datos.whatsapp, pais)].filter(
    (t): t is string => !!t,
  );
}

/** RN-07: no crea una empresa que ya existe; devuelve la existente para abrirla. */
export async function crearEmpresa(actor: Actor, datos: DatosEmpresa): Promise<ResultadoEscritura> {
  const duplicado = await buscarDuplicado(buscadorDuplicados(), {
    googlePlaceId: datos.googlePlaceId,
    telefonos: telefonosDe(datos, actor.pais),
  });
  if (duplicado) return { ok: false, duplicado };

  // El asesor queda como dueño de lo que crea; administración y socios pueden asignarla.
  const asesorId = actor.alcance === "todos" ? (datos.asesorId ?? null) : actor.usuarioId;
  const empresa = await db().empresa.create({
    data: { ...camposEmpresa(datos, actor.pais), asesorId, duenoDesde: asesorId ? new Date() : null },
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: "CREAR",
    entidad: "empresa",
    entidadId: empresa.id,
    despues: resumenAuditable(empresa),
  });
  return { ok: true, id: empresa.id };
}

export async function actualizarEmpresa(
  actor: Actor,
  id: string,
  datos: DatosEmpresa,
): Promise<ResultadoEscritura> {
  const anterior = await exigirVisible(actor, id);
  if (anterior.suprimidaEn) throw new ErrorEmpresaNoVisible();
  const duplicado = await buscarDuplicado(buscadorDuplicados(id), {
    googlePlaceId: datos.googlePlaceId,
    telefonos: telefonosDe(datos, actor.pais),
  });
  if (duplicado) return { ok: false, duplicado };

  const reasigna = actor.alcance === "todos" && (datos.asesorId ?? null) !== anterior.asesorId;
  const empresa = await db().empresa.update({
    where: { id },
    data: {
      ...camposEmpresa(datos, actor.pais),
      ...(reasigna ? { asesorId: datos.asesorId ?? null, duenoDesde: new Date() } : {}),
    },
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: reasigna ? "ACTUALIZAR_Y_REASIGNAR" : "ACTUALIZAR",
    entidad: "empresa",
    entidadId: id,
    antes: { ...resumenAuditable(anterior), asesorId: anterior.asesorId },
    despues: { ...resumenAuditable(empresa), asesorId: empresa.asesorId },
  });
  return { ok: true, id };
}

/** RN-08: marcar o quitar "no contactar". Queda en la auditoría. */
export async function cambiarNoContactar(actor: Actor, id: string, noContactar: boolean) {
  const anterior = await exigirVisible(actor, id);
  if (anterior.suprimidaEn) throw new ErrorEmpresaNoVisible();
  await db().empresa.update({ where: { id }, data: { noContactar } });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: noContactar ? "MARCAR_NO_CONTACTAR" : "QUITAR_NO_CONTACTAR",
    entidad: "empresa",
    entidadId: id,
    antes: { noContactar: anterior.noContactar },
    despues: { noContactar },
  });
}

export async function agregarContacto(
  actor: Actor,
  empresaId: string,
  datos: DatosContacto,
): Promise<ResultadoEscritura> {
  const empresa = await exigirVisible(actor, empresaId);
  if (empresa.suprimidaEn) throw new ErrorEmpresaNoVisible();
  const telefonoE164 = normalizarTelefono(datos.telefono, actor.pais);

  // RN-07: el teléfono del contacto no puede pertenecer a otra empresa.
  if (telefonoE164) {
    const duplicado = await buscarDuplicado(buscadorDuplicados(empresaId), { telefonos: [telefonoE164] });
    if (duplicado) return { ok: false, duplicado };
  }

  const { autorizo, ...resto } = datos;
  const contacto = await db().$transaction(async (tx) => {
    if (datos.esPrincipal) {
      await tx.contacto.updateMany({ where: { empresaId }, data: { esPrincipal: false } });
    }
    return tx.contacto.create({
      data: {
        ...resto,
        empresaId,
        telefonoE164,
        autorizacionFecha: autorizo ? new Date() : null,
        autorizacionOrigen: autorizo ? resto.autorizacionOrigen : null,
        autorizacionTexto: autorizo ? resto.autorizacionTexto : null,
      },
    });
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: "CREAR",
    entidad: "contacto",
    entidadId: contacto.id,
    despues: { empresaId, ...resumenAuditable(contacto), autorizado: autorizo },
  });
  return { ok: true, id: contacto.id };
}

/**
 * RN-47: suprime los datos personales de la empresa y de todos sus contactos. Conserva el
 * nombre comercial y lo contable. Es irreversible; solo la administración lo hace.
 */
export async function suprimirDatosPersonales(actor: Actor, id: string) {
  const anterior = await exigirVisible(actor, id);
  if (anterior.suprimidaEn) return;
  const ahora = new Date();
  await db().$transaction([
    db().empresa.update({ where: { id }, data: { ...datosSuprimidosEmpresa(ahora), utm: Prisma.DbNull } }),
    db().contacto.updateMany({ where: { empresaId: id }, data: datosSuprimidosContacto(ahora) }),
  ]);
  await auditar({
    usuarioId: actor.usuarioId,
    accion: "SUPRIMIR_DATOS_PERSONALES",
    entidad: "empresa",
    entidadId: id,
    antes: resumenAuditable(anterior),
    despues: { suprimidaEn: ahora.toISOString() },
  });
}
