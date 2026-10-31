import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion, db } from "@/lib/db";
import { puede } from "@/lib/permisos";
import { leerEtapas } from "@/modules/embudo/infraestructura/prisma";
import { EditorEtapas } from "./editor-etapas";

export const metadata: Metadata = { title: "Etapas del embudo" };

async function Editor() {
  const { organizacionId, rol } = await exigirSesion();
  if (!puede(rol, "configuracion.administrar")) {
    return <SinPermiso texto="Solo un administrador cambia las etapas del embudo." />;
  }
  const [etapas, enUso] = await conOrganizacion(organizacionId, async () =>
    Promise.all([leerEtapas(), db().negocio.groupBy({ by: ["etapaId"], _count: true })]),
  );
  const conteo = new Map(enUso.map((u) => [u.etapaId, u._count]));
  return (
    <EditorEtapas
      iniciales={etapas.map((e) => ({
        id: e.id,
        clave: e.id,
        nombre: e.nombre,
        tipoSistema: e.tipoSistema,
        limiteAsesor: e.limiteAsesor,
        probabilidad: e.probabilidad,
        activo: e.activo,
        negocios: conteo.get(e.id) ?? 0,
      }))}
    />
  );
}

export default function PaginaEtapas() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Etapas del embudo"
        detalle="Nombre, orden y probabilidad de cada etapa. El asesor mueve sus negocios hasta la etapa marcada como límite."
      />
      <Suspense fallback={<Cargando />}>
        <Editor />
      </Suspense>
    </main>
  );
}
