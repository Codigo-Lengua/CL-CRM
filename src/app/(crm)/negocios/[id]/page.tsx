import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import { Aviso, Cargando, EncabezadoPagina, Insignia, SinPermiso, Tarjeta } from "@/components/ui";
import { obtenerNegocio } from "@/modules/embudo/aplicacion/negocios";
import { monedaActiva } from "@/modules/embudo/infraestructura/prisma";
import { NOMBRE_TIPO } from "@/modules/embudo/dominio/etapas";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { diasDesde, fechaCorta, formatoMoneda } from "../formato";
import { comoActorEmbudo } from "../sesion-embudo";
import { BotonReabrir, EditarNegocio, MoverEtapa } from "./controles";

export const metadata: Metadata = { title: "Negocio" };

type Props = { params: Promise<{ id: string }> };

const fechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "America/Bogota",
});

const TONO = { ABIERTA: "primario", GANADA: "exito", ENTREGADA: "exito", PERDIDA: "peligro" } as const;

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="text-sm">{children || "—"}</dd>
    </div>
  );
}

async function Ficha({ params }: Props) {
  const { id } = await params;
  const resultado = await comoActorEmbudo(async (actor, contexto) => ({
    alcance: actor.alcance,
    datos: await obtenerNegocio(actor, id),
    moneda: await monedaActiva(),
    asesores: (await opcionesEmpresa(contexto.organizacionId)).asesores,
  }));
  if (!resultado) return <SinPermiso texto="Tu rol no tiene acceso al embudo." />;
  const { alcance, datos, moneda, asesores } = resultado.valor;
  if (!datos) notFound();
  const { negocio, destinos, motivos } = datos;
  const asesor = asesores.find((a) => a.id === negocio.asesorId)?.etiqueta;
  const perdido = negocio.etapa.tipoSistema === "PERDIDA";

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {negocio.nombre}
            <Insignia tono={TONO[negocio.etapa.tipoSistema]}>{negocio.etapa.nombre}</Insignia>
          </span>
        }
        detalle={
          <Link href={`/empresas/${negocio.empresa.id}`} className="text-enlace hover:underline">
            {negocio.empresa.nombre}
          </Link>
        }
      />
      {negocio.empresa.noContactar ? <Aviso tono="error">La empresa pidió no ser contactada.</Aviso> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="font-semibold">{perdido ? "Negocio perdido" : "Mover de etapa"}</h2>
          {perdido ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm">
                Motivo: <span className="font-medium">{negocio.motivoPerdida?.etiqueta ?? "—"}</span>
                {negocio.perdidoEn ? ` · ${fechaCorta.format(negocio.perdidoEn)}` : ""}
              </p>
              {alcance === "todos" ? (
                <div>
                  <BotonReabrir negocioId={negocio.id} />
                </div>
              ) : (
                <p className="text-sm text-texto-suave">
                  Solo administración o socios reabren un negocio perdido.
                </p>
              )}
            </div>
          ) : (
            <MoverEtapa
              negocioId={negocio.id}
              motivos={motivos}
              destinos={destinos.map(({ etapa, decision }) => ({
                id: etapa.id,
                nombre: etapa.nombre,
                tipoSistema: etapa.tipoSistema,
                permitido: decision.permitido,
                motivo: decision.permitido ? undefined : decision.motivo,
              }))}
            />
          )}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold">Datos</h2>
          </div>
          <dl className="grid gap-3">
            <Dato etiqueta="Valor estimado">{formatoMoneda(negocio.valorEstimado, moneda)}</Dato>
            <Dato etiqueta="Cierre estimado">
              {negocio.cierreEstimado ? fechaCorta.format(negocio.cierreEstimado) : null}
            </Dato>
            <Dato etiqueta="Asesor">{asesor ?? "Sin asignar"}</Dato>
            <Dato etiqueta="En esta etapa">{diasDesde(negocio.etapaDesde)}</Dato>
            <Dato etiqueta="Tipo de etapa">{NOMBRE_TIPO[negocio.etapa.tipoSistema]}</Dato>
          </dl>
          <EditarNegocio
            negocioId={negocio.id}
            asesores={alcance === "todos" ? asesores : null}
            valores={{
              nombre: negocio.nombre,
              valorEstimado: negocio.valorEstimado ? String(Number(negocio.valorEstimado)) : "",
              cierreEstimado: negocio.cierreEstimado ? negocio.cierreEstimado.toISOString().slice(0, 10) : "",
              asesorId: negocio.asesorId ?? "",
            }}
          />
        </Tarjeta>
      </div>

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="font-semibold">Historial</h2>
        <ol className="flex flex-col gap-3 border-l border-borde pl-4">
          {negocio.historial.map((h) => (
            <li key={h.id} className="text-sm">
              <p>
                {h.etapaOrigen ? (
                  <>
                    {h.etapaOrigen.nombre} → <span className="font-medium">{h.etapaDestino.nombre}</span>
                  </>
                ) : (
                  <>
                    Creado en <span className="font-medium">{h.etapaDestino.nombre}</span>
                  </>
                )}
              </p>
              <p className="text-xs text-texto-suave">
                {fechaHora.format(h.cambiadoEn)}
                {h.usuarioId ? ` · ${asesores.find((a) => a.id === h.usuarioId)?.etiqueta ?? "Usuario"}` : ""}
                {h.motivo && h.motivo !== "Creación" ? ` · ${h.motivo}` : ""}
              </p>
            </li>
          ))}
        </ol>
      </Tarjeta>
    </div>
  );
}

export default function PaginaNegocio({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Suspense fallback={<Cargando texto="Cargando negocio…" />}>
        <Ficha params={params} />
      </Suspense>
    </main>
  );
}
