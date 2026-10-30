"use server";

import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import type { ContextoSesion } from "@/lib/auth/contexto-sesion";
import { conPermiso } from "@/lib/auth/sesion";
import { db, dbPlataforma } from "@/lib/db";
import { ErrorSinPermiso } from "@/lib/permisos";
import { DEFINICIONES, esClave, validarParametro } from "@/modules/parametros/dominio/definiciones";
import { parametros } from "@/modules/parametros/infraestructura/prisma";

export type Resultado = { ok: true } | { ok: false; error: string };

const TIPOS_CATALOGO = [
  "CATEGORIA_EMPRESA",
  "FUENTE_LEAD",
  "MOTIVO_PERDIDA",
  "RESULTADO_ACTIVIDAD",
  "LINEA_SERVICIO",
  "MOTIVO_DEVOLUCION",
  "TIPO_SOLICITUD_DATOS",
] as const;

const CANALES = ["WHATSAPP", "CORREO", "ASESOR"] as const;

/** Errores que se le muestran al administrador; cualquier otro se registra y se oculta. */
class ErrorDeValidacion extends Error {}

function primerError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Revisa los datos.";
}

/**
 * Toda acción de esta pantalla: exige configuracion.administrar, corre en la organización
 * activa (RN-02) y deja el cambio en la auditoría.
 */
async function ejecutar(fn: (contexto: ContextoSesion) => Promise<void>): Promise<Resultado> {
  try {
    await conPermiso("configuracion.administrar", async (contexto) => {
      await fn(contexto);
      parametros().invalidar(contexto.organizacionId);
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof ErrorDeValidacion) return { ok: false, error: error.message };
    if (error instanceof ErrorSinPermiso)
      return { ok: false, error: "Solo un administrador puede cambiar la configuración." };
    // redirect() de exigirSesion también llega aquí y debe propagarse.
    throw error;
  }
}

async function auditar(
  contexto: ContextoSesion,
  accion: string,
  entidad: string,
  entidadId: string,
  antes: unknown,
  despues: unknown,
) {
  await db().auditoria.create({
    data: {
      usuarioId: contexto.usuarioId,
      accion,
      entidad,
      entidadId,
      antes: (antes ?? undefined) as Prisma.InputJsonValue | undefined,
      despues: (despues ?? undefined) as Prisma.InputJsonValue | undefined,
    },
  });
}

export async function guardarParametro(clave: string, valor: unknown): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    if (!esClave(clave)) throw new ErrorDeValidacion("Ese parámetro no existe.");
    const definicion = DEFINICIONES[clave];
    if (definicion.editablePor !== "ADMIN") {
      throw new ErrorDeValidacion("Este parámetro solo lo cambia la plataforma.");
    }
    const validado = validarParametro(clave, valor);
    if (!validado.ok) throw new ErrorDeValidacion(validado.error);
    if (clave === "usuario_respaldo_id" && validado.valor) {
      await exigirMiembro(contexto, validado.valor as string);
    }

    const anterior = await db().configuracion.findFirst({ where: { clave } });
    const nuevo = (validado.valor ?? null) as Prisma.InputJsonValue;
    const fila = await db().configuracion.upsert({
      where: { organizacionId_clave: { organizacionId: contexto.organizacionId, clave } },
      create: {
        clave,
        valor: nuevo,
        tipo: definicion.tipo,
        descripcion: definicion.descripcion,
        editablePor: definicion.editablePor,
      },
      update: { valor: nuevo },
    });
    await auditar(
      contexto,
      "ACTUALIZAR",
      "configuracion",
      fila.id,
      { [clave]: anterior?.valor ?? null },
      { [clave]: fila.valor },
    );
  });
}

async function exigirMiembro(contexto: ContextoSesion, usuarioId: string) {
  // member es tabla de plataforma: se consulta con el filtro de organización explícito.
  const miembro = await dbPlataforma().member.findFirst({
    where: { organizationId: contexto.organizacionId, userId: usuarioId },
    select: { id: true },
  });
  if (!miembro) throw new ErrorDeValidacion("La persona de respaldo debe ser parte del equipo.");
}

const esquemaNuevoValor = z.object({
  tipo: z.enum(TIPOS_CATALOGO),
  etiqueta: z.string().trim().min(1, "Escribe el nombre del valor.").max(80),
});

/** Código interno a partir de la etiqueta: "Dejó de responder" → DEJO_DE_RESPONDER. */
function codigoDe(etiqueta: string): string {
  return etiqueta
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 60);
}

export async function agregarValorCatalogo(datos: unknown): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    const leido = esquemaNuevoValor.safeParse(datos);
    if (!leido.success) throw new ErrorDeValidacion(primerError(leido.error));
    const { tipo, etiqueta } = leido.data;
    const codigo = codigoDe(etiqueta);
    if (!codigo) throw new ErrorDeValidacion("El nombre debe tener letras o números.");

    const existente = await db().valorCatalogo.findFirst({ where: { tipo, codigo } });
    if (existente) throw new ErrorDeValidacion(`Ya existe "${existente.etiqueta}" en esta lista.`);
    const ultimo = await db().valorCatalogo.aggregate({ where: { tipo }, _max: { orden: true } });
    const fila = await db().valorCatalogo.create({
      data: { tipo, codigo, etiqueta, orden: (ultimo._max.orden ?? 0) + 10 },
    });
    await auditar(contexto, "CREAR", "valor_catalogo", fila.id, null, { tipo, codigo, etiqueta });
  });
}

const esquemaCambioValor = z.object({
  id: z.uuid(),
  etiqueta: z.string().trim().min(1, "Escribe el nombre del valor.").max(80),
  activo: z.boolean(),
});

export async function actualizarValorCatalogo(datos: unknown): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    const leido = esquemaCambioValor.safeParse(datos);
    if (!leido.success) throw new ErrorDeValidacion(primerError(leido.error));
    const { id, etiqueta, activo } = leido.data;

    const anterior = await db().valorCatalogo.findFirst({ where: { id } });
    if (!anterior) throw new ErrorDeValidacion("Ese valor ya no existe.");
    if (anterior.esSistema && !activo) {
      throw new ErrorDeValidacion("Este valor lo usa el sistema y no se puede desactivar.");
    }
    // El código no cambia: los registros guardan el id y los reportes el código.
    await db().valorCatalogo.update({ where: { id }, data: { etiqueta, activo } });
    await auditar(
      contexto,
      "ACTUALIZAR",
      "valor_catalogo",
      id,
      { etiqueta: anterior.etiqueta, activo: anterior.activo },
      { etiqueta, activo },
    );
  });
}

export async function moverValorCatalogo(id: string, direccion: "subir" | "bajar"): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    const valor = await db().valorCatalogo.findFirst({ where: { id } });
    if (!valor) throw new ErrorDeValidacion("Ese valor ya no existe.");
    const vecino = await db().valorCatalogo.findFirst({
      where: { tipo: valor.tipo, orden: direccion === "subir" ? { lt: valor.orden } : { gt: valor.orden } },
      orderBy: { orden: direccion === "subir" ? "desc" : "asc" },
    });
    if (!vecino) return;
    await db().$transaction([
      db().valorCatalogo.update({ where: { id: valor.id }, data: { orden: vecino.orden } }),
      db().valorCatalogo.update({ where: { id: vecino.id }, data: { orden: valor.orden } }),
    ]);
    await auditar(
      contexto,
      "REORDENAR",
      "valor_catalogo",
      id,
      { orden: valor.orden },
      { orden: vecino.orden },
    );
  });
}

const esquemaCanales = z
  .array(
    z.object({
      canal: z.enum(CANALES),
      activo: z.boolean(),
      reintentos: z
        .number()
        .int()
        .min(0, "Los reintentos no pueden ser negativos.")
        .max(10, "Máximo 10 reintentos."),
      plantilla: z.string().trim().max(200).nullable(),
      visibleEnCotizador: z.boolean(),
    }),
  )
  .length(CANALES.length)
  .refine((canales) => new Set(canales.map((c) => c.canal)).size === CANALES.length, "Falta algún canal.")
  .refine((canales) => canales.some((c) => c.activo), "Deja al menos un canal de envío encendido.");

/** Guarda los tres canales en el orden recibido: el primero tiene prioridad 1. */
export async function guardarCanales(datos: unknown): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    const leido = esquemaCanales.safeParse(datos);
    if (!leido.success) throw new ErrorDeValidacion(primerError(leido.error));

    const antes = await db().canalEnvio.findMany({ orderBy: { prioridad: "asc" } });
    const despues = leido.data.map((c, i) => ({ ...c, plantilla: c.plantilla || null, prioridad: i + 1 }));
    await db().$transaction(
      despues.map((c) =>
        db().canalEnvio.upsert({
          where: { organizacionId_canal: { organizacionId: contexto.organizacionId, canal: c.canal } },
          create: { ...c, actualizadoPorId: contexto.usuarioId },
          update: { ...c, actualizadoPorId: contexto.usuarioId },
        }),
      ),
    );
    await auditar(
      contexto,
      "ACTUALIZAR",
      "canal_envio",
      contexto.organizacionId,
      antes.map(({ canal, activo, prioridad, reintentos, plantilla, visibleEnCotizador }) => ({
        canal,
        activo,
        prioridad,
        reintentos,
        plantilla,
        visibleEnCotizador,
      })),
      despues,
    );
  });
}

const esquemaFestivo = z.object({
  fecha: z.iso.date("Elige una fecha."),
  nombre: z.string().trim().min(1, "Escribe el nombre del festivo.").max(80),
});

export async function agregarFestivo(datos: unknown): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    const leido = esquemaFestivo.safeParse(datos);
    if (!leido.success) throw new ErrorDeValidacion(primerError(leido.error));
    const fecha = new Date(`${leido.data.fecha}T00:00:00Z`);
    const existente = await db().festivo.findFirst({ where: { fecha } });
    if (existente) throw new ErrorDeValidacion(`Ese día ya está como "${existente.nombre}".`);
    const fila = await db().festivo.create({ data: { fecha, nombre: leido.data.nombre } });
    await auditar(contexto, "CREAR", "festivo", fila.id, null, leido.data);
  });
}

export async function quitarFestivo(id: string): Promise<Resultado> {
  return ejecutar(async (contexto) => {
    if (!z.uuid().safeParse(id).success) throw new ErrorDeValidacion("Ese festivo no existe.");
    const anterior = await db().festivo.findFirst({ where: { id } });
    if (!anterior) throw new ErrorDeValidacion("Ese festivo ya no existe.");
    await db().festivo.delete({ where: { id } });
    await auditar(
      contexto,
      "ELIMINAR",
      "festivo",
      id,
      { fecha: anterior.fecha.toISOString().slice(0, 10), nombre: anterior.nombre },
      null,
    );
  });
}
