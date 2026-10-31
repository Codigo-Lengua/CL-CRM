import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  BotonEnlace,
  Cargando,
  clasesControl,
  cx,
  EncabezadoPagina,
  EstadoVacio,
  Insignia,
  SinPermiso,
} from "@/components/ui";
import { puede } from "@/lib/permisos";
import { tablero } from "@/modules/embudo/aplicacion/negocios";
import { monedaActiva } from "@/modules/embudo/infraestructura/prisma";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { diasDesde, formatoMoneda } from "./formato";
import { comoActorEmbudo } from "./sesion-embudo";

export const metadata: Metadata = { title: "Negocios" };

type Parametros = Promise<Record<string, string | string[] | undefined>>;

const TONO_COLUMNA = {
  ABIERTA: "border-t-primario",
  GANADA: "border-t-exito",
  ENTREGADA: "border-t-exito",
  PERDIDA: "border-t-peligro",
} as const;

async function Tablero({ searchParams }: { searchParams: Parametros }) {
  const p = await searchParams;
  const asesorId = (Array.isArray(p.asesor) ? p.asesor[0] : p.asesor) || undefined;
  const resultado = await comoActorEmbudo(async (actor, contexto) => ({
    alcance: actor.alcance,
    datos: await tablero(actor, { asesorId }),
    moneda: await monedaActiva(),
    asesores: (await opcionesEmpresa(contexto.organizacionId)).asesores,
  }));
  if (!resultado) return <SinPermiso texto="Tu rol no tiene acceso al embudo." />;
  const { alcance, datos, moneda, asesores } = resultado.valor;
  const esAdmin = puede(resultado.contexto.rol, "configuracion.administrar");
  const nombreAsesor = new Map(asesores.map((a) => [a.id, a.etiqueta]));
  const abiertos = datos.negocios.filter(
    (n) => datos.etapas.find((e) => e.id === n.etapaId)?.tipoSistema === "ABIERTA",
  );
  const ponderado = abiertos.reduce((suma, n) => {
    const etapa = datos.etapas.find((e) => e.id === n.etapaId)!;
    return suma + (Number(n.valorEstimado ?? 0) * etapa.probabilidad) / 100;
  }, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <dl className="flex flex-wrap gap-6 text-sm">
          <div>
            <dt className="text-texto-suave">Abiertos</dt>
            <dd className="text-lg font-semibold tabular-nums">{abiertos.length}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">Valor ponderado</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatoMoneda(ponderado, moneda)}</dd>
          </div>
          <div>
            <dt className="text-texto-suave">Clientes asegurados</dt>
            <dd className="text-lg font-semibold tabular-nums">{datos.clientesAsegurados}</dd>
          </div>
        </dl>
        <div className="flex flex-wrap items-end gap-2">
          {alcance === "todos" ? (
            <form action="/negocios" className="flex items-end gap-2">
              <label className="flex flex-col gap-1 text-sm font-medium">
                Asesor
                <select name="asesor" defaultValue={asesorId ?? ""} className={clasesControl}>
                  <option value="">Todos</option>
                  {asesores.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.etiqueta}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className={`${clasesControl} font-medium hover:bg-superficie-alta`}>
                Filtrar
              </button>
            </form>
          ) : null}
          {esAdmin ? (
            <BotonEnlace variante="secundario" href="/negocios/etapas">
              Editar etapas
            </BotonEnlace>
          ) : null}
        </div>
      </div>

      {datos.negocios.length === 0 ? (
        <EstadoVacio
          titulo="Aún no hay negocios"
          detalle="Los negocios se crean desde la ficha de cada empresa."
          accion={<BotonEnlace href="/empresas">Ir a empresas</BotonEnlace>}
        />
      ) : (
        <div
          className="-mx-6 overflow-x-auto px-6 pb-2"
          role="region"
          aria-label="Etapas del embudo"
          tabIndex={0}
        >
          <ol className="flex min-w-max gap-3">
            {datos.etapas.map((etapa) => {
              const enEtapa = datos.negocios.filter((n) => n.etapaId === etapa.id);
              const total = enEtapa.reduce((s, n) => s + Number(n.valorEstimado ?? 0), 0);
              return (
                <li
                  key={etapa.id}
                  className={cx(
                    "flex w-64 shrink-0 flex-col gap-2 rounded-lg border border-t-4 border-borde bg-superficie p-3",
                    TONO_COLUMNA[etapa.tipoSistema],
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <h2 className="text-sm font-semibold">
                      {etapa.nombre} <span className="font-normal text-texto-suave">({enEtapa.length})</span>
                    </h2>
                    {etapa.limiteAsesor ? <Insignia title="Último paso del asesor">Límite</Insignia> : null}
                  </div>
                  <p className="text-xs text-texto-suave tabular-nums">
                    {formatoMoneda(total, moneda)} · {etapa.probabilidad}%
                  </p>
                  <ul className="flex flex-col gap-2">
                    {enEtapa.map((n) => (
                      <li key={n.id}>
                        <Link
                          href={`/negocios/${n.id}`}
                          className="flex flex-col gap-1 rounded-md border border-borde bg-fondo p-2.5 text-sm hover:border-borde-control"
                        >
                          <span className="font-medium">{n.empresa.nombre}</span>
                          <span className="text-texto-suave">{n.nombre}</span>
                          <span className="flex justify-between text-xs text-texto-suave tabular-nums">
                            <span>{formatoMoneda(n.valorEstimado, moneda)}</span>
                            <span>{diasDesde(n.etapaDesde)}</span>
                          </span>
                          {alcance === "todos" ? (
                            <span className="text-xs text-texto-suave">
                              {n.asesorId ? (nombreAsesor.get(n.asesorId) ?? "—") : "Sin asignar"}
                            </span>
                          ) : null}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </div>
  );
}

export default function PaginaNegocios({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Negocios"
        detalle="El embudo comercial: dónde está cada oportunidad y desde cuándo."
      />
      <Suspense fallback={<Cargando texto="Cargando el embudo…" />}>
        <Tablero searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
