import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { COLUMNAS } from "@/modules/catalogo/dominio/importacion/columnas";
import { MAXIMO_FILAS } from "@/modules/catalogo/dominio/importacion/lectura";
import { monedaActiva } from "@/modules/embudo/infraestructura/prisma";
import { enCatalogo } from "../sesion-catalogo";
import { Importador } from "./importador";

export const metadata: Metadata = { title: "Importar catálogo" };

async function Contenido() {
  const { acceso, valor } = await enCatalogo(() => monedaActiva());
  if (!acceso.edita) return <SinPermiso texto="Solo un administrador importa el catálogo." />;
  return (
    <Importador
      moneda={valor}
      maximoFilas={MAXIMO_FILAS}
      columnas={COLUMNAS.map((c) => ({ encabezado: c.encabezado, ayuda: c.ayuda }))}
    />
  );
}

export default function PaginaImportar() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Importar catálogo"
        detalle="Carga o actualiza servicios, planes, precios y costos desde un archivo de Excel, CSV o PDF."
      />
      <Suspense fallback={<Cargando />}>
        <Contenido />
      </Suspense>
    </main>
  );
}
