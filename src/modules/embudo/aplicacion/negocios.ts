import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { type Etapa, etapaInicial, problemaDelEmbudo } from "../dominio/etapas";
import { cambiosAlMover, ErrorMotivoPerdida, estaAbierto, etapaParaReabrir } from "../dominio/negocio";
import { puedeMover } from "../dominio/transiciones";
import { auditar, leerEtapas, motivosDePerdida, tieneCotizacionAceptada } from "../infraestructura/prisma";
import type { DatosEtapa, DatosNegocio } from "./esquemas";

/** Quién actúa y con qué alcance de negocios.mover (CL-CRM-02 §11). */
export interface Actor {
  usuarioId: string;
  alcance: "todos" | "asignados";
}

/** Un error que se le muestra a la persona tal cual. */
export class ErrorEmbudo extends Error {
  constructor(mensaje: string) {
    super(mensaje);
    this.name = "ErrorEmbudo";
  }
}

const NO_VISIBLE = "Ese negocio no existe o no lo tienes asignado.";

export function filtroVisibles(actor: Actor): Prisma.NegocioWhereInput {
  return actor.alcance === "todos" ? {} : { asesorId: actor.usuarioId };
}

const resumen = (n: {
  nombre: string;
  etapaId: string;
  asesorId: string | null;
  valorEstimado: unknown;
}) => ({
  nombre: n.nombre,
  etapaId: n.etapaId,
  asesorId: n.asesorId,
  valorEstimado: n.valorEstimado === null ? null : String(n.valorEstimado),
});

export async function tablero(actor: Actor, filtros: { asesorId?: string }) {
  const etapas = await leerEtapas();
  const where: Prisma.NegocioWhereInput = {
    ...filtroVisibles(actor),
    ...(filtros.asesorId && actor.alcance === "todos" ? { asesorId: filtros.asesorId } : {}),
  };
  const [negocios, clientesAsegurados] = await Promise.all([
    db().negocio.findMany({
      where,
      orderBy: { etapaDesde: "asc" },
      select: {
        id: true,
        nombre: true,
        etapaId: true,
        etapaDesde: true,
        asesorId: true,
        valorEstimado: true,
        cierreEstimado: true,
        empresa: { select: { id: true, nombre: true } },
      },
    }),
    // RN-26: el contador del acuerdo de socios es de toda la organización.
    db().negocio.count({ where: { entregadoEn: { not: null } } }),
  ]);
  return { etapas: etapas.filter((e) => e.activo), negocios, clientesAsegurados };
}

export async function obtenerNegocio(actor: Actor, id: string) {
  const negocio = await db().negocio.findFirst({
    where: { id, ...filtroVisibles(actor) },
    include: {
      empresa: { select: { id: true, nombre: true, noContactar: true } },
      etapa: true,
      motivoPerdida: { select: { etiqueta: true } },
      historial: {
        orderBy: { cambiadoEn: "desc" },
        include: { etapaOrigen: { select: { nombre: true } }, etapaDestino: { select: { nombre: true } } },
      },
    },
  });
  if (!negocio) return null;
  const etapas = await leerEtapas();
  const condiciones = { cotizacionAceptada: await tieneCotizacionAceptada(id) };
  const quien = { alcance: actor.alcance, esDueno: negocio.asesorId === actor.usuarioId };
  // Las etapas a que puede llevarlo quien mira, con el motivo de las que no.
  const destinos = etapas
    .filter((e) => e.activo && e.id !== negocio.etapaId)
    .map((e) => ({ etapa: e, decision: puedeMover(quien, negocio.etapa, e, etapas, condiciones) }));
  return { negocio, destinos, motivos: await motivosDePerdida() };
}

/** Negocios de una empresa, para su ficha. */
export async function negociosDeEmpresa(actor: Actor, empresaId: string) {
  return db().negocio.findMany({
    where: { empresaId, ...filtroVisibles(actor) },
    orderBy: { creadoEn: "desc" },
    select: {
      id: true,
      nombre: true,
      valorEstimado: true,
      etapa: { select: { nombre: true, tipoSistema: true } },
    },
  });
}

export type ResultadoCrear =
  { ok: true; id: string } | { ok: false; existente: { id: string; nombre: string } };

/**
 * Crea un negocio en la primera etapa abierta. D-14: si la empresa ya tiene uno abierto, no
 * se crea otro y se devuelve ese.
 */
export async function crearNegocio(
  actor: Actor,
  empresaId: string,
  datos: DatosNegocio,
): Promise<ResultadoCrear> {
  const empresa = await db().empresa.findFirst({
    where: {
      id: empresaId,
      suprimidaEn: null,
      ...(actor.alcance === "todos" ? {} : { asesorId: actor.usuarioId }),
    },
    select: { id: true, asesorId: true },
  });
  if (!empresa) throw new ErrorEmbudo("Esa empresa no existe o no la tienes asignada.");

  const abierto = await db().negocio.findFirst({
    where: { empresaId, etapa: { tipoSistema: "ABIERTA" } },
    select: { id: true, nombre: true },
  });
  if (abierto) return { ok: false, existente: abierto };

  const inicial = etapaInicial(await leerEtapas());
  if (!inicial) throw new ErrorEmbudo("El embudo no tiene etapas abiertas.");
  const asesorId =
    actor.alcance === "todos" ? (datos.asesorId ?? empresa.asesorId ?? actor.usuarioId) : actor.usuarioId;

  const negocio = await db().$transaction(async (tx) => {
    const creado = await tx.negocio.create({
      data: {
        empresaId,
        nombre: datos.nombre,
        valorEstimado: datos.valorEstimado ?? null,
        cierreEstimado: datos.cierreEstimado ?? null,
        asesorId,
        etapaId: inicial.id,
      },
    });
    await tx.historialEtapa.create({
      data: {
        negocioId: creado.id,
        etapaDestinoId: inicial.id,
        usuarioId: actor.usuarioId,
        motivo: "Creación",
      },
    });
    return creado;
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: "CREAR",
    entidad: "negocio",
    entidadId: negocio.id,
    despues: resumen(negocio),
  });
  return { ok: true, id: negocio.id };
}

export async function actualizarNegocio(actor: Actor, id: string, datos: DatosNegocio) {
  const anterior = await db().negocio.findFirst({ where: { id, ...filtroVisibles(actor) } });
  if (!anterior) throw new ErrorEmbudo(NO_VISIBLE);
  const reasigna =
    actor.alcance === "todos" && datos.asesorId !== undefined && datos.asesorId !== anterior.asesorId;
  const negocio = await db().negocio.update({
    where: { id },
    data: {
      nombre: datos.nombre,
      valorEstimado: datos.valorEstimado ?? null,
      cierreEstimado: datos.cierreEstimado ?? null,
      ...(reasigna ? { asesorId: datos.asesorId } : {}),
    },
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: reasigna ? "ACTUALIZAR_Y_REASIGNAR" : "ACTUALIZAR",
    entidad: "negocio",
    entidadId: id,
    antes: resumen(anterior),
    despues: resumen(negocio),
  });
}

/**
 * Mueve un negocio de etapa (RN-21), exige motivo al perderlo (RN-22) y deja el cambio en el
 * historial y la auditoría (RN-25) en la misma transacción.
 */
export async function moverNegocio(
  actor: Actor,
  id: string,
  destinoId: string,
  opciones: { motivoPerdidaId?: string | null; nota?: string | null } = {},
) {
  const negocio = await db().negocio.findFirst({
    where: { id, ...filtroVisibles(actor) },
    include: { etapa: true },
  });
  if (!negocio) throw new ErrorEmbudo(NO_VISIBLE);
  const etapas = await leerEtapas();
  const destino = etapas.find((e) => e.id === destinoId);
  if (!destino) throw new ErrorEmbudo("Esa etapa no existe.");

  const decision = puedeMover(
    { alcance: actor.alcance, esDueno: negocio.asesorId === actor.usuarioId },
    negocio.etapa,
    destino,
    etapas,
    { cotizacionAceptada: await tieneCotizacionAceptada(id) },
  );
  if (!decision.permitido) throw new ErrorEmbudo(decision.motivo);

  let motivoTexto: string | null = opciones.nota?.trim() || null;
  if (destino.tipoSistema === "PERDIDA") {
    const motivo = (await motivosDePerdida()).find((m) => m.id === opciones.motivoPerdidaId);
    if (!motivo) throw new ErrorMotivoPerdida();
    motivoTexto = [motivo.etiqueta, motivoTexto].filter(Boolean).join(": ");
  }
  const { ganadoEn, entregadoEn, perdidoEn, motivoPerdidaId, etapaId } = negocio;
  const cambios = cambiosAlMover(
    { etapaId, ganadoEn, entregadoEn, perdidoEn, motivoPerdidaId },
    destino,
    new Date(),
    opciones.motivoPerdidaId,
  );

  await db().$transaction(async (tx) => {
    await tx.negocio.update({ where: { id }, data: cambios });
    await tx.historialEtapa.create({
      data: {
        negocioId: id,
        etapaOrigenId: negocio.etapaId,
        etapaDestinoId: destino.id,
        usuarioId: actor.usuarioId,
        motivo: motivoTexto,
      },
    });
  });
  await auditar({
    usuarioId: actor.usuarioId,
    accion: "CAMBIAR_ETAPA",
    entidad: "negocio",
    entidadId: id,
    antes: { etapa: negocio.etapa.nombre },
    despues: { etapa: destino.nombre, motivo: motivoTexto },
  });
}

/** Reabre un negocio perdido en la última etapa abierta en que estuvo. */
export async function reabrirNegocio(actor: Actor, id: string) {
  const negocio = await db().negocio.findFirst({
    where: { id, ...filtroVisibles(actor) },
    include: { historial: { orderBy: { cambiadoEn: "asc" }, select: { etapaDestinoId: true } } },
  });
  if (!negocio) throw new ErrorEmbudo(NO_VISIBLE);
  const destino = etapaParaReabrir(negocio.historial, await leerEtapas());
  if (!destino) throw new ErrorEmbudo("El embudo no tiene etapas abiertas.");
  await moverNegocio(actor, id, destino.id, { nota: "Reabierto" });
}

/**
 * Guarda el embudo de la organización: nombres, orden, probabilidad, límite del asesor y
 * etapas nuevas. Una etapa con negocios no se desactiva ni cambia de tipo.
 */
export async function guardarEtapas(usuarioId: string, lista: DatosEtapa[]) {
  const actuales = await leerEtapas();
  const porId = new Map(actuales.map((e) => [e.id, e]));
  const propuesta: Etapa[] = lista.map((e, i) => ({
    ...e,
    id: e.id ?? `nueva-${i}`,
    orden: (i + 1) * 10,
  }));
  const problema = problemaDelEmbudo(propuesta);
  if (problema) throw new ErrorEmbudo(problema);
  for (const e of lista) {
    if (e.id && !porId.has(e.id)) throw new ErrorEmbudo("Una de las etapas ya no existe. Recarga la página.");
  }
  const enUso = await db().negocio.groupBy({ by: ["etapaId"], _count: true });
  const usadas = new Set(enUso.map((u) => u.etapaId));
  for (const e of lista) {
    const actual = e.id ? porId.get(e.id) : undefined;
    if (!actual || !usadas.has(actual.id)) continue;
    if (!e.activo)
      throw new ErrorEmbudo(`«${actual.nombre}» tiene negocios; muévelos antes de desactivarla.`);
    if (e.tipoSistema !== actual.tipoSistema)
      throw new ErrorEmbudo(`«${actual.nombre}» tiene negocios; no puede cambiar de tipo.`);
  }

  await db().$transaction(async (tx) => {
    for (const [i, e] of lista.entries()) {
      const data = {
        nombre: e.nombre,
        tipoSistema: e.tipoSistema,
        limiteAsesor: e.limiteAsesor,
        probabilidad: e.probabilidad,
        activo: e.activo,
        orden: (i + 1) * 10,
      };
      if (e.id) await tx.etapaEmbudo.update({ where: { id: e.id }, data });
      else await tx.etapaEmbudo.create({ data });
    }
  });
  await auditar({
    usuarioId,
    accion: "ACTUALIZAR",
    entidad: "etapa_embudo",
    entidadId: "embudo",
    antes: actuales.map(({ nombre, tipoSistema, activo }) => ({ nombre, tipoSistema, activo })),
    despues: lista.map(({ nombre, tipoSistema, activo }) => ({ nombre, tipoSistema, activo })),
  });
}

export { estaAbierto };
