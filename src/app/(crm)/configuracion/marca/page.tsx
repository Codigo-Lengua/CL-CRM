import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion } from "@/lib/db";
import { puede } from "@/lib/permisos";
import { leerMarca } from "@/modules/marca/infraestructura/prisma";
import { EditorMarca } from "./editor-marca";

export const metadata: Metadata = { title: "Marca" };

async function Marca() {
  const { organizacionId, rol } = await exigirSesion();
  if (!puede(rol, "configuracion.administrar")) {
    return <SinPermiso texto="Solo un administrador puede cambiar la marca." />;
  }
  const marca = await conOrganizacion(organizacionId, () => leerMarca());
  return <EditorMarca inicial={marca} />;
}

export default function PaginaMarca() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Marca"
        detalle="Colores, fuentes y logos de tu organización. El cambio se ve en todo el CRM al guardar, sin desplegar."
      />
      <Suspense fallback={<Cargando />}>
        <Marca />
      </Suspense>
    </main>
  );
}
