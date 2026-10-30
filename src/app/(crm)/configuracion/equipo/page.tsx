import { type Metadata } from "next";
import { Suspense } from "react";
import { exigirSesion } from "@/lib/auth/sesion";
import { dbPlataforma } from "@/lib/db";
import { puede, ROLES } from "@/lib/permisos";
import { GestionEquipo } from "./gestion-equipo";

export const metadata: Metadata = { title: "Equipo" };

async function Equipo() {
  // Solo ADMIN (configuracion.administrar). Los modelos de Better Auth se leen con el
  // cliente de plataforma, así que el filtro por organización va explícito.
  const { organizacionId, miembroId, rol } = await exigirSesion();
  if (!puede(rol, "configuracion.administrar")) {
    return <p role="alert">Solo un administrador puede gestionar el equipo.</p>;
  }
  const datos = await (async () => {
    const plataforma = dbPlataforma();
    const [miembros, invitaciones] = await Promise.all([
      plataforma.member.findMany({
        where: { organizationId: organizacionId },
        select: {
          id: true,
          role: true,
          user: { select: { name: true, email: true, twoFactorEnabled: true } },
        },
        orderBy: { createdAt: "asc" },
      }),
      plataforma.invitation.findMany({
        where: { organizationId: organizacionId, status: "pending", expiresAt: { gt: new Date() } },
        select: { id: true, email: true, role: true, expiresAt: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);
    return { organizacionId, miembroId, miembros, invitaciones };
  })();

  return (
    <GestionEquipo
      organizacionId={datos.organizacionId}
      miembroActualId={datos.miembroId}
      roles={[...ROLES]}
      miembros={datos.miembros.map((m) => ({
        id: m.id,
        rol: m.role,
        nombre: m.user.name,
        email: m.user.email,
        dosPasos: !!m.user.twoFactorEnabled,
      }))}
      invitaciones={datos.invitaciones.map((i) => ({
        id: i.id,
        email: i.email,
        rol: i.role ?? "",
        vence: i.expiresAt.toISOString(),
      }))}
    />
  );
}

export default function PaginaEquipo() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Equipo</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Invita personas, cambia su rol o quítales el acceso. Los cambios quedan en la auditoría.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <Equipo />
      </Suspense>
    </main>
  );
}
