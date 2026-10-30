import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { obtenerEmpresa } from "@/modules/empresas/aplicacion/empresas";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { actualizarEmpresaAccion } from "../../acciones";
import { FormularioEmpresa } from "../../formulario-empresa";
import { comoActor } from "../../sesion-comercial";

export const metadata: Metadata = { title: "Editar empresa" };

type Props = { params: Promise<{ id: string }> };

async function Formulario({ params }: Props) {
  const { id } = await params;
  const resultado = await comoActor(async (actor, contexto) => ({
    alcance: actor.alcance,
    empresa: await obtenerEmpresa(actor, id),
    opciones: await opcionesEmpresa(contexto.organizacionId),
  }));
  if (!resultado) return <SinPermiso texto="Tu rol no puede editar empresas." />;
  const { alcance, empresa, opciones } = resultado.valor;
  if (!empresa || empresa.suprimidaEn) notFound();
  const v = (x: string | null) => x ?? "";
  return (
    <FormularioEmpresa
      valores={{
        nombre: empresa.nombre,
        categoriaId: v(empresa.categoriaId),
        fuenteId: v(empresa.fuenteId),
        asesorId: v(empresa.asesorId),
        canal: empresa.canal,
        origenDato: empresa.origenDato,
        telefono: v(empresa.telefono),
        whatsapp: v(empresa.whatsapp),
        correo: v(empresa.correo),
        direccion: v(empresa.direccion),
        localidad: v(empresa.localidad),
        ciudad: v(empresa.ciudad),
        sitioWeb: v(empresa.sitioWeb),
        instagram: v(empresa.instagram),
        campana: v(empresa.campana),
        aceptaWhatsapp: empresa.aceptaWhatsapp,
        notas: v(empresa.notas),
      }}
      opciones={opciones}
      puedeAsignar={alcance === "todos"}
      accion={actualizarEmpresaAccion.bind(null, id)}
      cancelarHref={`/empresas/${id}`}
      textoGuardar="Guardar cambios"
    />
  );
}

export default function PaginaEditarEmpresa({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <EncabezadoPagina titulo="Editar empresa" />
      <Suspense fallback={<Cargando />}>
        <Formulario params={params} />
      </Suspense>
    </main>
  );
}
