import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { listarImpuestos } from "@/modules/catalogo/aplicacion/catalogo";
import { hoyEnOrganizacion } from "@/modules/catalogo/infraestructura/prisma";
import { enCatalogo } from "../sesion-catalogo";
import { EditorImpuestos } from "./editor-impuestos";

export const metadata: Metadata = { title: "Impuestos" };

async function Editor() {
  const { acceso, valor } = await enCatalogo(async () => ({
    impuestos: await listarImpuestos(),
    hoy: await hoyEnOrganizacion(),
  }));
  if (!acceso.edita) return <SinPermiso texto="Solo un administrador configura los impuestos." />;
  return (
    <EditorImpuestos
      hoy={valor.hoy}
      impuestos={valor.impuestos.map((i) => ({
        id: i.id,
        codigo: i.codigo,
        nombre: i.nombre,
        tipo: i.tipo,
        porcentaje: i.porcentaje,
        incluidoEnPrecio: i.incluidoEnPrecio,
        desde: i.desde,
        hasta: i.hasta,
        activo: i.activo,
        servicios: i._count.servicios,
      }))}
    />
  );
}

export default function PaginaImpuestos() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Impuestos"
        detalle="Impuestos de la organización. En cada servicio eliges cuáles le aplican."
      />
      <Suspense fallback={<Cargando />}>
        <Editor />
      </Suspense>
    </main>
  );
}
