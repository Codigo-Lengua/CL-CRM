import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, Titulo } from "../_componentes/ui";
import { FormularioIngreso } from "./formulario";

export const metadata: Metadata = { title: "Ingresar" };

/** Solo se aceptan destinos internos, para no abrir una redirección a otro sitio. */
function destinoSeguro(valor: string | string[] | undefined): string {
  const d = Array.isArray(valor) ? valor[0] : valor;
  return d && d.startsWith("/") && !d.startsWith("//") && !d.startsWith("/\\") ? d : "/";
}

async function Formulario({ searchParams }: Pick<PageProps<"/ingresar">, "searchParams">) {
  const { destino } = await searchParams;
  return <FormularioIngreso destino={destinoSeguro(destino)} />;
}

export default function PaginaIngresar({ searchParams }: PageProps<"/ingresar">) {
  return (
    <>
      <Titulo>Ingresar</Titulo>
      <Suspense fallback={<Cargando />}>
        <Formulario searchParams={searchParams} />
      </Suspense>
    </>
  );
}
