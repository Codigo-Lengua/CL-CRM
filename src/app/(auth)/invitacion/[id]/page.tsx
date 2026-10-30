import { type Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { Suspense } from "react";
import { obtenerAuth } from "@/lib/auth/servidor";
import { dbPlataforma } from "@/lib/db";
import { esRol, NOMBRE_ROL } from "@/lib/permisos";
import { Aviso, Cargando, Titulo } from "../../_componentes/ui";
import { AceptarInvitacion } from "./aceptar";

export const metadata: Metadata = { title: "Invitación" };

const ES_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function Invitacion({ params }: Pick<PageProps<"/invitacion/[id]">, "params">) {
  const { id } = await params;
  const plataforma = dbPlataforma();
  const invitacion = ES_UUID.test(id)
    ? await plataforma.invitation.findUnique({
        where: { id },
        select: { id: true, email: true, role: true, status: true, expiresAt: true, organization: true },
      })
    : null;

  if (!invitacion || invitacion.status !== "pending" || invitacion.expiresAt < new Date()) {
    return (
      <>
        <Titulo>Invitación no disponible</Titulo>
        <Aviso>
          La invitación venció, ya se usó o fue cancelada. Pide a un administrador que te invite de nuevo.
        </Aviso>
        <Link href="/ingresar" className="text-center text-sm text-enlace hover:underline">
          Ir a ingresar
        </Link>
      </>
    );
  }

  const sesion = await obtenerAuth().api.getSession({ headers: await headers() });
  const cuentaExiste = sesion
    ? true
    : !!(await plataforma.user.findUnique({ where: { email: invitacion.email }, select: { id: true } }));

  return (
    <>
      <Titulo
        detalle={`Te invitaron con el rol ${esRol(invitacion.role) ? NOMBRE_ROL[invitacion.role] : "Asesor"}.`}
      >
        Únete a {invitacion.organization.name}
      </Titulo>
      <AceptarInvitacion
        invitacion={{
          id: invitacion.id,
          organizacionId: invitacion.organization.id,
          email: invitacion.email,
          sesionEmail: sesion?.user.email ?? null,
          cuentaExiste,
        }}
      />
    </>
  );
}

export default function PaginaInvitacion({ params }: PageProps<"/invitacion/[id]">) {
  return (
    <Suspense fallback={<Cargando />}>
      <Invitacion params={params} />
    </Suspense>
  );
}
