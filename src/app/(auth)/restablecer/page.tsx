import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Aviso, Cargando, Titulo } from "../_componentes/ui";
import { FormularioRestablecer } from "./formulario";

export const metadata: Metadata = { title: "Crear contraseña nueva" };

async function Contenido({ searchParams }: Pick<PageProps<"/restablecer">, "searchParams">) {
  const { token } = await searchParams;
  if (typeof token === "string" && token) return <FormularioRestablecer token={token} />;
  return (
    <>
      <Aviso>El enlace no es válido o venció.</Aviso>
      <Link href="/recuperar" className="text-center text-sm text-enlace hover:underline">
        Pedir otro enlace
      </Link>
    </>
  );
}

export default function PaginaRestablecer({ searchParams }: PageProps<"/restablecer">) {
  return (
    <>
      <Titulo>Crear contraseña nueva</Titulo>
      <Suspense fallback={<Cargando />}>
        <Contenido searchParams={searchParams} />
      </Suspense>
    </>
  );
}
