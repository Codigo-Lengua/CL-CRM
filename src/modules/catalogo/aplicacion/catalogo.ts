import { db } from "@/lib/db";
import { calcularImpuestos, type Desglose } from "../dominio/impuestos";
import { ErrorVigencia, planearNuevoPrecio, precioVigente } from "../dominio/precios";
import type { Dia } from "../dominio/vigencia";
import {
  aFecha,
  aImpuesto,
  aPrecio,
  auditar,
  esCodigoRepetido,
  esTraslape,
  hoyEnOrganizacion,
} from "../infraestructura/prisma";
import type { DatosCosto, DatosImpuesto, DatosPlan, DatosPrecio, DatosServicio } from "./esquemas";

/** Un error que se le muestra a la persona tal cual. */
export class ErrorCatalogo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorCatalogo";
  }
}

const ordenPrecios = { vigenteDesde: "desc" } as const;

export async function listarServicios(opciones: { incluirInactivos?: boolean } = {}) {
  const hoy = await hoyEnOrganizacion();
  const servicios = await db().servicio.findMany({
    where: opciones.incluirInactivos ? {} : { activo: true },
    orderBy: [{ linea: { orden: "asc" } }, { nombre: "asc" }],
    include: {
      linea: { select: { etiqueta: true } },
      precios: { orderBy: ordenPrecios },
      planes: { where: { activo: true }, include: { precios: { orderBy: ordenPrecios } } },
    },
  });
  return {
    hoy,
    servicios: servicios.map((s) => {
      const precios = s.planes.length
        ? s.planes.flatMap((p) => p.precios.map(aPrecio).filter((x) => precioVigente([x], hoy)))
        : [precioVigente(s.precios.map(aPrecio), hoy)].filter((x) => x !== null);
      const valores = precios.map((p) => p.valor);
      return {
        id: s.id,
        codigo: s.codigo,
        nombre: s.nombre,
        tipo: s.tipo,
        linea: s.linea?.etiqueta ?? null,
        activo: s.activo,
        visibleWeb: s.visibleWeb,
        requiereCotizacionManual: s.requiereCotizacionManual,
        planes: s.planes.length,
        desde: valores.length ? Math.min(...valores) : null,
      };
    }),
  };
}

/** Ficha del servicio. Los costos de terceros solo con costos.ver. */
export async function obtenerServicio(id: string, verCostos: boolean) {
  const hoy = await hoyEnOrganizacion();
  const s = await db().servicio.findFirst({
    where: { id },
    include: {
      linea: { select: { id: true, etiqueta: true } },
      precios: { orderBy: ordenPrecios },
      planes: { orderBy: { creadoEn: "asc" }, include: { precios: { orderBy: ordenPrecios } } },
      costos: verCostos ? { orderBy: { creadoEn: "asc" } } : false,
      impuestos: { include: { impuesto: true } },
    },
  });
  if (!s) return null;
  const impuestos = s.impuestos.map((si) => aImpuesto(si.impuesto));
  const conDesglose = (valor: number | undefined) =>
    valor === undefined ? null : calcularImpuestos(valor, impuestos, hoy);
  return {
    hoy,
    servicio: s,
    precios: s.precios.map(aPrecio),
    vigente: conDesglose(precioVigente(s.precios.map(aPrecio), hoy)?.valor),
    planes: s.planes.map((p) => {
      const precios = p.precios.map(aPrecio);
      return { ...p, precios, vigente: conDesglose(precioVigente(precios, hoy)?.valor) };
    }),
    costos: verCostos ? (s.costos ?? []).map((c) => ({ ...c, valor: Number(c.valor) })) : null,
    impuestoIds: s.impuestos.map((si) => si.impuestoId),
  };
}

export async function guardarServicio(usuarioId: string, datos: DatosServicio, id?: string) {
  try {
    const antes = id ? await db().servicio.findFirst({ where: { id } }) : null;
    if (id && !antes) throw new ErrorCatalogo("Ese servicio no existe.");
    const servicio = id
      ? await db().servicio.update({ where: { id }, data: datos })
      : await db().servicio.create({ data: datos });
    await auditar({
      usuarioId,
      accion: id ? "ACTUALIZAR" : "CREAR",
      entidad: "servicio",
      entidadId: servicio.id,
      antes: antes ?? undefined,
      despues: servicio,
    });
    return servicio.id;
  } catch (error) {
    if (esCodigoRepetido(error))
      throw new ErrorCatalogo(`Ya existe un servicio con el código ${datos.codigo}.`);
    throw error;
  }
}

export async function guardarPlan(usuarioId: string, servicioId: string, datos: DatosPlan, id?: string) {
  const servicio = await db().servicio.findFirst({ where: { id: servicioId }, select: { tipo: true } });
  if (!servicio) throw new ErrorCatalogo("Ese servicio no existe.");
  if (servicio.tipo !== "MENSUAL") throw new ErrorCatalogo("Solo los servicios mensuales tienen planes.");
  const plan = id
    ? await db().plan.update({ where: { id, servicioId }, data: datos })
    : await db().plan.create({ data: { ...datos, servicioId } });
  await auditar({
    usuarioId,
    accion: id ? "ACTUALIZAR" : "CREAR",
    entidad: "plan",
    entidadId: plan.id,
    despues: plan,
  });
  return plan.id;
}

/**
 * RN-27: agrega un precio sin sobrescribir ninguno. Si el vigente no tiene fin, se cierra el día
 * anterior; si se cruza con otro, se rechaza. La base de datos lo garantiza también.
 */
export async function agregarPrecio(usuarioId: string, servicioId: string, datos: DatosPrecio) {
  const servicio = await db().servicio.findFirst({
    where: { id: servicioId },
    include: { planes: { select: { id: true } } },
  });
  if (!servicio) throw new ErrorCatalogo("Ese servicio no existe.");
  const planId = datos.planId ?? null;
  if (planId && !servicio.planes.some((p) => p.id === planId)) throw new ErrorCatalogo("Ese plan no existe.");
  if (!planId && servicio.planes.length > 0)
    throw new ErrorCatalogo("Este servicio tiene planes: elige a qué plan.");

  const destino = planId ? { planId } : { servicioId };
  try {
    const precio = await db().$transaction(async (tx) => {
      const existentes = (await tx.precio.findMany({ where: destino })).map(aPrecio);
      const { cerrar } = planearNuevoPrecio(existentes, { desde: datos.desde, hasta: datos.hasta ?? null });
      if (cerrar)
        await tx.precio.update({ where: { id: cerrar.id }, data: { vigenteHasta: aFecha(cerrar.hasta) } });
      return tx.precio.create({
        data: {
          ...destino,
          valor: datos.valor,
          vigenteDesde: aFecha(datos.desde),
          vigenteHasta: datos.hasta ? aFecha(datos.hasta) : null,
          usuarioId,
        },
      });
    });
    await auditar({
      usuarioId,
      accion: "CREAR",
      entidad: "precio",
      entidadId: precio.id,
      despues: { ...destino, valor: datos.valor, desde: datos.desde, hasta: datos.hasta ?? null },
    });
    return precio.id;
  } catch (error) {
    if (error instanceof ErrorVigencia) throw new ErrorCatalogo(error.message);
    if (esTraslape(error)) throw new ErrorCatalogo("Ese precio se cruza con otro del mismo servicio o plan.");
    throw error;
  }
}

export async function agregarCosto(usuarioId: string, servicioId: string, datos: DatosCosto) {
  if (!(await db().servicio.findFirst({ where: { id: servicioId }, select: { id: true } })))
    throw new ErrorCatalogo("Ese servicio no existe.");
  const costo = await db().costoTerceros.create({ data: { ...datos, servicioId } });
  await auditar({
    usuarioId,
    accion: "CREAR",
    entidad: "costo_terceros",
    entidadId: costo.id,
    despues: datos,
  });
}

export async function eliminarCosto(usuarioId: string, id: string) {
  const costo = await db().costoTerceros.findFirst({ where: { id } });
  if (!costo) return;
  await db().costoTerceros.delete({ where: { id } });
  await auditar({ usuarioId, accion: "ELIMINAR", entidad: "costo_terceros", entidadId: id, antes: costo });
}

export async function listarImpuestos() {
  const impuestos = await db().impuesto.findMany({
    orderBy: { codigo: "asc" },
    include: { _count: { select: { servicios: true } } },
  });
  return impuestos.map((i) => ({ ...i, ...aImpuesto(i) }));
}

export async function guardarImpuesto(usuarioId: string, datos: DatosImpuesto, id?: string) {
  const data = {
    codigo: datos.codigo,
    nombre: datos.nombre,
    tipo: datos.tipo,
    porcentaje: datos.porcentaje,
    incluidoEnPrecio: datos.tipo === "TRASLADADO" && datos.incluidoEnPrecio,
    vigenteDesde: aFecha(datos.desde),
    vigenteHasta: datos.hasta ? aFecha(datos.hasta) : null,
    activo: datos.activo,
  };
  if (datos.hasta && datos.hasta < datos.desde)
    throw new ErrorCatalogo("La fecha final no puede ser anterior a la inicial.");
  try {
    const impuesto = id
      ? await db().impuesto.update({ where: { id }, data })
      : await db().impuesto.create({ data });
    await auditar({
      usuarioId,
      accion: id ? "ACTUALIZAR" : "CREAR",
      entidad: "impuesto",
      entidadId: impuesto.id,
      despues: datos,
    });
  } catch (error) {
    if (esCodigoRepetido(error))
      throw new ErrorCatalogo(`Ya existe un impuesto con el código ${datos.codigo}.`);
    throw error;
  }
}

/** Impuestos que aplican al servicio (SERVICIO_IMPUESTO). Reemplaza la lista completa. */
export async function asignarImpuestos(usuarioId: string, servicioId: string, impuestoIds: string[]) {
  const validos = await db().impuesto.findMany({ where: { id: { in: impuestoIds } }, select: { id: true } });
  if (validos.length !== new Set(impuestoIds).size)
    throw new ErrorCatalogo("Uno de los impuestos no existe.");
  await db().$transaction(async (tx) => {
    await tx.servicioImpuesto.deleteMany({ where: { servicioId } });
    if (validos.length)
      await tx.servicioImpuesto.createMany({ data: validos.map((v) => ({ servicioId, impuestoId: v.id })) });
  });
  await auditar({
    usuarioId,
    accion: "ASIGNAR_IMPUESTOS",
    entidad: "servicio",
    entidadId: servicioId,
    despues: impuestoIds,
  });
}

export interface PrecioPublico {
  valor: number;
  desglose: Desglose;
}

/**
 * Catálogo para el sitio web y el cotizador: servicios activos y visibles con su precio vigente
 * e impuestos. Nunca devuelve costos. Un servicio con cotización manual va sin precio (RN-34).
 */
export async function catalogoPublico(dia?: Dia) {
  const hoy = dia ?? (await hoyEnOrganizacion());
  const servicios = await db().servicio.findMany({
    where: { activo: true, visibleWeb: true },
    orderBy: [{ linea: { orden: "asc" } }, { nombre: "asc" }],
    select: {
      codigo: true,
      nombre: true,
      tipo: true,
      incluye: true,
      entregaDias: true,
      requiereCotizacionManual: true,
      linea: { select: { codigo: true, etiqueta: true } },
      precios: true,
      impuestos: { select: { impuesto: true } },
      planes: {
        where: { activo: true },
        orderBy: { creadoEn: "asc" },
        select: { nombre: true, limiteUso: true, precios: true },
      },
    },
  });
  const precioDe = (
    precios: Parameters<typeof aPrecio>[0][],
    impuestos: ReturnType<typeof aImpuesto>[],
    manual: boolean,
  ) => {
    if (manual) return null;
    const vigente = precioVigente(precios.map(aPrecio), hoy);
    return vigente
      ? { valor: vigente.valor, desglose: calcularImpuestos(vigente.valor, impuestos, hoy) }
      : null;
  };
  return {
    fecha: hoy,
    servicios: servicios.map((s) => {
      const impuestos = s.impuestos.map((i) => aImpuesto(i.impuesto));
      return {
        codigo: s.codigo,
        nombre: s.nombre,
        tipo: s.tipo,
        linea: s.linea ? { codigo: s.linea.codigo, nombre: s.linea.etiqueta } : null,
        incluye: s.incluye,
        entregaDias: s.entregaDias,
        cotizacionManual: s.requiereCotizacionManual,
        precio: s.planes.length ? null : precioDe(s.precios, impuestos, s.requiereCotizacionManual),
        planes: s.planes.map((p) => ({
          nombre: p.nombre,
          limiteUso: p.limiteUso,
          precio: precioDe(p.precios, impuestos, s.requiereCotizacionManual),
        })),
      };
    }),
  };
}
