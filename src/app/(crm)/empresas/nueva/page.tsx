import { type Metadata } from "next";
import { Suspense } from "react";
import { Cargando, EncabezadoPagina, SinPermiso } from "@/components/ui";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { crearEmpresaAccion } from "../acciones";
import { FormularioEmpresa } from "../formulario-empresa";
import { comoActor } from "../sesion-comercial";

export const metadata: Metadata = { title: "Nueva empresa" };

async function Formulario() {
  const resultado = await comoActor(async (actor, contexto) => ({
    alcance: actor.alcance,
    opciones: await opcionesEmpresa(contexto.organizacionId),
  }));
  if (!resultado) return <SinPermiso texto="Tu rol no puede registrar empresas." />;
  const { alcance, opciones } = resultado.valor;
  return (
    <FormularioEmpresa
      valores={{
        nombre: "",
        categoriaId: "",
        fuenteId: "",
        asesorId: alcance === "todos" ? "" : resultado.contexto.usuarioId,
        canal: "MANUAL",
        origenDato: "FORMULARIO",
        telefono: "",
        whatsapp: "",
        correo: "",
        direccion: "",
        localidad: "",
        ciudad: "",
        sitioWeb: "",
        instagram: "",
        campana: "",
        aceptaWhatsapp: false,
        notas: "",
      }}
      opciones={opciones}
      puedeAsignar={alcance === "todos"}
      accion={crearEmpresaAccion}
      cancelarHref="/empresas"
      textoGuardar="Registrar empresa"
    />
  );
}

export default function PaginaNuevaEmpresa() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Nueva empresa"
        detalle="Antes de guardar revisamos que no exista ya con el mismo teléfono."
      />
      <Suspense fallback={<Cargando />}>
        <Formulario />
      </Suspense>
    </main>
  );
}
