import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  BotonEnlace,
  Cargando,
  EncabezadoPagina,
  EstadoVacio,
  Insignia,
  Tabla,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { listarServicios } from "@/modules/catalogo/aplicacion/catalogo";
import { monedaActiva } from "@/modules/embudo/infraestructura/prisma";
import { formatoMoneda } from "../negocios/formato";
import { enCatalogo } from "./sesion-catalogo";

export const metadata: Metadata = { title: "Catálogo" };

async function Lista() {
  const { acceso, valor } = await enCatalogo(async (a) => ({
    ...(await listarServicios({ incluirInactivos: a.edita })),
    moneda: await monedaActiva(),
  }));
  const { servicios, moneda } = valor;
  if (servicios.length === 0) {
    return (
      <EstadoVacio
        titulo="El catálogo está vacío"
        detalle={
          acceso.edita
            ? "Agrega el primer servicio con su precio."
            : "La administración aún no ha cargado servicios."
        }
        accion={acceso.edita ? <BotonEnlace href="/catalogo/nuevo">Nuevo servicio</BotonEnlace> : null}
      />
    );
  }
  const lineas = [...new Set(servicios.map((s) => s.linea ?? "Sin línea"))];
  return (
    <div className="flex flex-col gap-6">
      {lineas.map((linea) => (
        <section key={linea} className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold tracking-wide text-texto-suave uppercase">{linea}</h2>
          <Tabla>
            <thead>
              <tr>
                <Th>Servicio</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Precio vigente</Th>
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {servicios
                .filter((s) => (s.linea ?? "Sin línea") === linea)
                .map((s) => (
                  <Tr key={s.id}>
                    <Td>
                      <Link href={`/catalogo/${s.id}`} className="font-medium text-enlace hover:underline">
                        {s.nombre}
                      </Link>
                      <span className="block text-xs text-texto-suave">{s.codigo}</span>
                    </Td>
                    <Td>
                      {s.tipo === "MENSUAL" ? "Mensual" : "Proyecto"}
                      {s.planes ? <span className="text-texto-suave"> · {s.planes} planes</span> : null}
                    </Td>
                    <Td className="text-right tabular-nums">
                      {s.requiereCotizacionManual
                        ? "A cotizar"
                        : s.desde === null
                          ? "Sin precio"
                          : `${s.planes ? "Desde " : ""}${formatoMoneda(s.desde, moneda)}${s.tipo === "MENSUAL" ? " / mes" : ""}`}
                    </Td>
                    <Td>
                      <span className="flex flex-wrap gap-1">
                        {!s.activo ? <Insignia>Inactivo</Insignia> : null}
                        {s.activo && !s.visibleWeb ? <Insignia>Solo interno</Insignia> : null}
                        {s.requiereCotizacionManual ? (
                          <Insignia tono="aviso">Cotización manual</Insignia>
                        ) : null}
                        {s.activo && s.desde === null && !s.requiereCotizacionManual ? (
                          <Insignia tono="peligro">Sin precio vigente</Insignia>
                        ) : null}
                      </span>
                    </Td>
                  </Tr>
                ))}
            </tbody>
          </Tabla>
        </section>
      ))}
    </div>
  );
}

async function Acciones() {
  const { acceso } = await enCatalogo(() => Promise.resolve(null));
  if (!acceso.edita) return null;
  return (
    <div className="flex gap-2">
      <BotonEnlace variante="secundario" href="/catalogo/impuestos">
        Impuestos
      </BotonEnlace>
      <BotonEnlace href="/catalogo/nuevo">Nuevo servicio</BotonEnlace>
    </div>
  );
}

export default function PaginaCatalogo() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Catálogo"
        detalle="Servicios, planes y precios vigentes con los que se cotiza."
        acciones={
          <Suspense>
            <Acciones />
          </Suspense>
        }
      />
      <Suspense fallback={<Cargando texto="Cargando el catálogo…" />}>
        <Lista />
      </Suspense>
    </main>
  );
}
