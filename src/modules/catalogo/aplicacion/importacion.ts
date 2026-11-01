import { type ClienteDb, db } from "@/lib/db";
import { leerCatalogo } from "../dominio/importacion/lectura";
import { type EstadoCatalogo, type OperacionServicio, planearImportacion } from "../dominio/importacion/plan";
import { planearNuevoPrecio } from "../dominio/precios";
import { ErrorArchivo, leerArchivo } from "../infraestructura/archivos";
import { aFecha, aPrecio, auditar, hoyEnOrganizacion } from "../infraestructura/prisma";
import { ErrorCatalogo } from "./catalogo";

/** Lo que la importación usa del cliente; lo cumplen db() y el cliente de una transacción. */
type Tx = Pick<
  ClienteDb,
  | "servicio"
  | "plan"
  | "precio"
  | "costoTerceros"
  | "servicioImpuesto"
  | "valorCatalogo"
  | "impuesto"
  | "auditoria"
>;

async function estadoActual(cliente: Tx): Promise<EstadoCatalogo> {
  // En serie: dentro de una transacción todas las consultas van por la misma conexión.
  const servicios = await cliente.servicio.findMany({
    select: {
      id: true,
      codigo: true,
      tipo: true,
      precios: true,
      planes: { select: { id: true, nombre: true, precios: true } },
      costos: { select: { id: true, concepto: true } },
      impuestos: { select: { impuestoId: true } },
    },
  });
  const lineas = await cliente.valorCatalogo.findMany({
    where: { tipo: "LINEA_SERVICIO" },
    select: { id: true, codigo: true, etiqueta: true },
  });
  const impuestos = await cliente.impuesto.findMany({ select: { id: true, codigo: true } });
  return {
    servicios: servicios.map((s) => ({
      ...s,
      precios: s.precios.map(aPrecio),
      planes: s.planes.map((p) => ({ ...p, precios: p.precios.map(aPrecio) })),
      impuestoIds: s.impuestos.map((i) => i.impuestoId),
    })),
    lineas,
    impuestos,
  };
}

async function planDe(nombre: string, bytes: Uint8Array, hoy: string, cliente: Tx) {
  try {
    const { formato, filas } = await leerArchivo(nombre, bytes);
    const lectura = leerCatalogo(filas, hoy);
    return { formato, plan: planearImportacion(lectura, await estadoActual(cliente)) };
  } catch (error) {
    if (error instanceof ErrorArchivo) throw new ErrorCatalogo(error.message);
    throw error;
  }
}

/** Vista previa: lee el archivo y simula la importación sin escribir nada. */
export async function revisarImportacion(nombre: string, bytes: Uint8Array) {
  return planDe(nombre, bytes, await hoyEnOrganizacion(), db());
}

/**
 * Importa todo o nada. El plan se vuelve a calcular dentro de la transacción, así que si alguien
 * cambió el catálogo entre la vista previa y la confirmación, se valida contra lo más reciente.
 */
export async function importarCatalogo(usuarioId: string, nombre: string, bytes: Uint8Array) {
  const hoy = await hoyEnOrganizacion();
  return db().$transaction(
    async (tx) => {
      const { plan } = await planDe(nombre, bytes, hoy, tx);
      if (plan.errores.length)
        throw new ErrorCatalogo(
          `El archivo tiene ${plan.errores.length} errores; corrígelos y vuelve a subirlo.`,
        );
      const lineas = await crearLineas(tx, plan.resumen.lineasNuevas);
      for (const operacion of plan.operaciones) await aplicar(tx, usuarioId, operacion, lineas);
      return plan.resumen;
    },
    { timeout: 60_000, maxWait: 10_000 },
  );
}

function codigoDeLinea(etiqueta: string, usados: Set<string>) {
  const base =
    etiqueta
      .normalize("NFD")
      .replace(/\p{Diacritic}/gu, "")
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40) || "LINEA";
  let codigo = base;
  for (let n = 2; usados.has(codigo); n++) codigo = `${base}_${n}`;
  usados.add(codigo);
  return codigo;
}

async function crearLineas(tx: Tx, etiquetas: string[]) {
  const ids = new Map<string, string>();
  if (!etiquetas.length) return ids;
  const existentes = await tx.valorCatalogo.findMany({
    where: { tipo: "LINEA_SERVICIO" },
    select: { codigo: true, orden: true },
  });
  const usados = new Set(existentes.map((e) => e.codigo));
  let orden = Math.max(0, ...existentes.map((e) => e.orden));
  for (const etiqueta of etiquetas) {
    const linea = await tx.valorCatalogo.create({
      data: { tipo: "LINEA_SERVICIO", codigo: codigoDeLinea(etiqueta, usados), etiqueta, orden: ++orden },
    });
    ids.set(etiqueta, linea.id);
  }
  return ids;
}

async function aplicar(tx: Tx, usuarioId: string, o: OperacionServicio, lineas: Map<string, string>) {
  const { linea, ...campos } = o.datos;
  const lineaId =
    linea === undefined
      ? undefined
      : linea === null
        ? null
        : "id" in linea
          ? linea.id
          : lineas.get(linea.nueva)!;
  const datos = { ...campos, ...(lineaId !== undefined ? { lineaId } : {}) };

  const servicioId = o.servicioId
    ? (await tx.servicio.update({ where: { id: o.servicioId }, data: datos })).id
    : (
        await tx.servicio.create({
          data: {
            codigo: o.codigo,
            nombre: datos.nombre!,
            tipo: datos.tipo!,
            ...datos,
            visibleWeb: datos.visibleWeb ?? true,
            requiereCotizacionManual: datos.requiereCotizacionManual ?? false,
          },
        })
      ).id;

  const planes = new Map<string, string>();
  for (const p of o.planes) {
    const id = p.planId
      ? (await tx.plan.update({ where: { id: p.planId }, data: { limiteUso: p.limiteUso } })).id
      : (await tx.plan.create({ data: { servicioId, nombre: p.nombre, limiteUso: p.limiteUso ?? null } })).id;
    planes.set(p.nombre.toLowerCase(), id);
  }
  if (o.precios.some((p) => p.plan && !planes.has(p.plan.toLowerCase()))) {
    const existentes = await tx.plan.findMany({ where: { servicioId }, select: { id: true, nombre: true } });
    for (const p of existentes)
      if (!planes.has(p.nombre.toLowerCase())) planes.set(p.nombre.toLowerCase(), p.id);
  }

  for (const p of o.precios.filter((x) => x.estado === "NUEVO")) {
    const destino = p.plan ? { planId: planes.get(p.plan.toLowerCase())! } : { servicioId };
    const existentes = (await tx.precio.findMany({ where: destino })).map(aPrecio);
    const { cerrar } = planearNuevoPrecio(existentes, { desde: p.desde, hasta: p.hasta });
    if (cerrar)
      await tx.precio.update({ where: { id: cerrar.id }, data: { vigenteHasta: aFecha(cerrar.hasta) } });
    await tx.precio.create({
      data: {
        ...destino,
        valor: p.valor,
        vigenteDesde: aFecha(p.desde),
        vigenteHasta: p.hasta ? aFecha(p.hasta) : null,
        usuarioId,
      },
    });
  }

  for (const c of o.costos) {
    const data = { concepto: c.concepto, valor: c.valor, periodicidad: c.periodicidad };
    if (c.costoId) await tx.costoTerceros.update({ where: { id: c.costoId }, data });
    else await tx.costoTerceros.create({ data: { ...data, servicioId } });
  }

  if (o.impuestoIds.length)
    await tx.servicioImpuesto.createMany({
      data: o.impuestoIds.map((impuestoId) => ({ servicioId, impuestoId })),
      skipDuplicates: true,
    });

  await auditar(
    {
      usuarioId,
      accion: o.accion === "CREAR" ? "IMPORTAR_CREAR" : "IMPORTAR_ACTUALIZAR",
      entidad: "servicio",
      entidadId: servicioId,
      despues: {
        ...o.datos,
        planes: o.planes.map((p) => p.nombre),
        precios: o.precios
          .filter((p) => p.estado === "NUEVO")
          .map(({ plan, valor, desde, hasta }) => ({ plan, valor, desde, hasta })),
        costos: o.costos.map(({ concepto, valor, periodicidad }) => ({ concepto, valor, periodicidad })),
      },
    },
    tx,
  );
}
