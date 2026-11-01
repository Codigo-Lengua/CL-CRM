import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  BotonEnlace,
  Cargando,
  EncabezadoPagina,
  Insignia,
  Tabla,
  Tarjeta,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { listarImpuestos, obtenerServicio } from "@/modules/catalogo/aplicacion/catalogo";
import type { Desglose } from "@/modules/catalogo/dominio/impuestos";
import type { PrecioConVigencia } from "@/modules/catalogo/dominio/precios";
import { monedaActiva } from "@/modules/embudo/infraestructura/prisma";
import { formatoMoneda } from "../../negocios/formato";
import { enCatalogo } from "../sesion-catalogo";
import {
  BotonEliminarCosto,
  FormularioCosto,
  FormularioPlan,
  FormularioPrecio,
  ImpuestosDelServicio,
} from "./formularios";

export const metadata: Metadata = { title: "Servicio" };

type Props = { params: Promise<{ id: string }> };

const PERIODICIDAD = { UNICO: "Único", MENSUAL: "Mensual", ANUAL: "Anual" } as const;

const fecha = (dia: string) =>
  new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "UTC" }).format(
    new Date(`${dia}T00:00:00Z`),
  );

function DesgloseVigente({
  desglose,
  moneda,
  mensual,
}: {
  desglose: Desglose | null;
  moneda: string;
  mensual: boolean;
}) {
  if (!desglose) return <p className="text-sm text-peligro">Sin precio vigente hoy.</p>;
  return (
    <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm tabular-nums">
      <dt className="text-texto-suave">Base</dt>
      <dd className="text-right">{formatoMoneda(desglose.base, moneda)}</dd>
      {desglose.impuestos.map((i) => (
        <div key={i.codigo} className="contents">
          <dt className="text-texto-suave">
            {i.tipo === "RETENIDO" ? "− " : "+ "}
            {i.nombre} {i.porcentaje} %
          </dt>
          <dd className="text-right">{formatoMoneda(i.valor, moneda)}</dd>
        </div>
      ))}
      <dt className="font-semibold">Total{mensual ? " al mes" : ""}</dt>
      <dd className="text-right font-semibold">{formatoMoneda(desglose.total, moneda)}</dd>
    </dl>
  );
}

function HistorialPrecios({
  precios,
  hoy,
  moneda,
}: {
  precios: PrecioConVigencia[];
  hoy: string;
  moneda: string;
}) {
  if (precios.length === 0) return <p className="text-sm text-texto-suave">Sin precios registrados.</p>;
  return (
    <Tabla>
      <thead>
        <tr>
          <Th>Vigencia</Th>
          <Th className="text-right">Valor</Th>
          <Th />
        </tr>
      </thead>
      <tbody>
        {precios.map((p) => {
          const vigente = p.desde <= hoy && (p.hasta === null || hoy <= p.hasta);
          const futuro = p.desde > hoy;
          return (
            <Tr key={p.id}>
              <Td>
                {fecha(p.desde)} — {p.hasta ? fecha(p.hasta) : "sin fin"}
              </Td>
              <Td className="text-right tabular-nums">{formatoMoneda(p.valor, moneda)}</Td>
              <Td>
                {vigente ? (
                  <Insignia tono="exito">Vigente</Insignia>
                ) : futuro ? (
                  <Insignia tono="primario">Programado</Insignia>
                ) : null}
              </Td>
            </Tr>
          );
        })}
      </tbody>
    </Tabla>
  );
}

async function Ficha({ params }: Props) {
  const { id } = await params;
  const { acceso, valor } = await enCatalogo(async (a) => ({
    datos: await obtenerServicio(id, a.verCostos),
    impuestos: a.edita ? await listarImpuestos() : [],
    moneda: await monedaActiva(),
  }));
  const { datos, impuestos, moneda } = valor;
  if (!datos) notFound();
  const { servicio: s, hoy } = datos;
  const mensual = s.tipo === "MENSUAL";

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {s.nombre}
            {!s.activo ? <Insignia>Inactivo</Insignia> : null}
            {s.requiereCotizacionManual ? <Insignia tono="aviso">Cotización manual</Insignia> : null}
          </span>
        }
        detalle={[
          s.codigo,
          s.linea?.etiqueta,
          mensual ? "Mensual" : "Proyecto",
          s.visibleWeb ? "Visible en la web" : "Solo interno",
        ]
          .filter(Boolean)
          .join(" · ")}
        acciones={acceso.edita ? <BotonEnlace href={`/catalogo/${s.id}/editar`}>Editar</BotonEnlace> : null}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="flex flex-col gap-3 lg:col-span-2">
          <h2 className="font-semibold">Qué incluye</h2>
          <p className="text-sm whitespace-pre-line">{s.incluye || "Sin descripción."}</p>
          <p className="text-xs text-texto-suave">
            {[
              s.entregaDias ? `Entrega en ${s.entregaDias} días` : null,
              s.horas ? `${s.horas} horas estimadas` : null,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Tarjeta>
        {datos.planes.length === 0 ? (
          <Tarjeta className="flex flex-col gap-3">
            <h2 className="font-semibold">Precio de hoy</h2>
            <DesgloseVigente desglose={datos.vigente} moneda={moneda} mensual={mensual} />
          </Tarjeta>
        ) : null}
      </div>

      {mensual ? (
        <Tarjeta className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Planes</h2>
            {acceso.edita ? <FormularioPlan servicioId={s.id} /> : null}
          </div>
          {datos.planes.length === 0 ? (
            <p className="text-sm text-texto-suave">Sin planes: el servicio tiene un solo precio.</p>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {datos.planes.map((p) => (
                <div key={p.id} className="flex flex-col gap-3 rounded-md border border-borde p-4">
                  <h3 className="flex items-center gap-2 font-medium">
                    {p.nombre}
                    {p.limiteUso ? (
                      <span className="text-xs text-texto-suave">hasta {p.limiteUso} al mes</span>
                    ) : null}
                    {!p.activo ? <Insignia>Inactivo</Insignia> : null}
                  </h3>
                  <DesgloseVigente desglose={p.vigente} moneda={moneda} mensual />
                  <HistorialPrecios precios={p.precios} hoy={hoy} moneda={moneda} />
                </div>
              ))}
            </div>
          )}
        </Tarjeta>
      ) : null}

      <Tarjeta className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Precios</h2>
          {acceso.edita ? (
            <FormularioPrecio
              servicioId={s.id}
              hoy={hoy}
              planes={datos.planes.map((p) => ({ id: p.id, nombre: p.nombre }))}
            />
          ) : null}
        </div>
        {datos.planes.length ? (
          <p className="text-sm text-texto-suave">Los precios de este servicio van por plan.</p>
        ) : (
          <HistorialPrecios precios={datos.precios} hoy={hoy} moneda={moneda} />
        )}
      </Tarjeta>

      <div className="grid gap-6 lg:grid-cols-2">
        {acceso.edita ? (
          <Tarjeta className="flex flex-col gap-4">
            <h2 className="font-semibold">Impuestos que aplican</h2>
            <ImpuestosDelServicio
              servicioId={s.id}
              asignados={datos.impuestoIds}
              impuestos={impuestos.map((i) => ({
                id: i.id,
                nombre: i.nombre,
                codigo: i.codigo,
                porcentaje: i.porcentaje,
                activo: i.activo,
              }))}
            />
          </Tarjeta>
        ) : null}
        {datos.costos ? (
          <Tarjeta className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-semibold">Costos de terceros</h2>
              {acceso.edita ? <FormularioCosto servicioId={s.id} /> : null}
            </div>
            <p className="text-xs text-texto-suave">Nunca se muestran al cliente ni al asesor.</p>
            {datos.costos.length === 0 ? (
              <p className="text-sm text-texto-suave">Sin costos registrados.</p>
            ) : (
              <ul className="divide-y divide-borde">
                {datos.costos.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 py-2 text-sm">
                    <span>
                      {c.concepto} <span className="text-texto-suave">· {PERIODICIDAD[c.periodicidad]}</span>
                    </span>
                    <span className="flex items-center gap-2 tabular-nums">
                      {formatoMoneda(c.valor, moneda)}
                      {acceso.edita ? <BotonEliminarCosto servicioId={s.id} costoId={c.id} /> : null}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Tarjeta>
        ) : null}
      </div>
    </div>
  );
}

export default function PaginaServicio({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Suspense fallback={<Cargando texto="Cargando servicio…" />}>
        <Ficha params={params} />
      </Suspense>
    </main>
  );
}
