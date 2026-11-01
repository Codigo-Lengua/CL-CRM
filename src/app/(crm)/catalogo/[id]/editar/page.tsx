import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { db } from "@/lib/db";
import { FormularioServicio } from "../../formulario-servicio";
import { lineasDeServicio } from "../../lineas";
import { enCatalogo } from "../../sesion-catalogo";

export const metadata: Metadata = { title: "Editar servicio" };

type Props = { params: Promise<{ id: string }> };

async function Formulario({ params }: Props) {
  const { id } = await params;
  const { acceso, valor } = await enCatalogo(async () => ({
    lineas: await lineasDeServicio(),
    servicio: await db().servicio.findFirst({ where: { id } }),
  }));
  if (!acceso.edita) return <SinPermiso texto="Solo un administrador edita el catálogo." />;
  const s = valor.servicio;
  if (!s) notFound();
  return (
    <FormularioServicio
      id={s.id}
      lineas={valor.lineas}
      valores={{
        codigo: s.codigo,
        nombre: s.nombre,
        lineaId: s.lineaId ?? "",
        tipo: s.tipo,
        incluye: s.incluye ?? "",
        entregaDias: s.entregaDias?.toString() ?? "",
        horas: s.horas?.toString() ?? "",
        visibleWeb: s.visibleWeb,
        requiereCotizacionManual: s.requiereCotizacionManual,
        activo: s.activo,
      }}
    />
  );
}

export default function PaginaEditarServicio({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <EncabezadoPagina titulo="Editar servicio" />
      <Suspense fallback={<Cargando />}>
        <Formulario params={params} />
      </Suspense>
    </main>
  );
}
