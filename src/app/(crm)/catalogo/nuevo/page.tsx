import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { FormularioServicio } from "../formulario-servicio";
import { lineasDeServicio } from "../lineas";
import { enCatalogo } from "../sesion-catalogo";

export const metadata: Metadata = { title: "Nuevo servicio" };

async function Formulario() {
  const { acceso, valor: lineas } = await enCatalogo(() => lineasDeServicio());
  if (!acceso.edita) return <SinPermiso texto="Solo un administrador edita el catálogo." />;
  return (
    <FormularioServicio
      id={null}
      lineas={lineas}
      valores={{
        codigo: "",
        nombre: "",
        lineaId: "",
        tipo: "PROYECTO",
        incluye: "",
        entregaDias: "",
        horas: "",
        visibleWeb: true,
        requiereCotizacionManual: false,
        activo: true,
      }}
    />
  );
}

export default function PaginaNuevoServicio() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Nuevo servicio"
        detalle="Después de guardarlo le agregas el precio y los planes."
      />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </main>
  );
}
