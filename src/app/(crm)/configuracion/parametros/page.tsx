import { type Metadata } from "next";
import { Suspense } from "react";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion, db, dbPlataforma } from "@/lib/db";
import { puede } from "@/lib/permisos";
import { festivosColombia } from "@/modules/calendario/dominio/festivos-colombia";
import { CLAVES, DEFINICIONES } from "@/modules/parametros/dominio/definiciones";
import { parametros } from "@/modules/parametros/infraestructura/prisma";
import { EditorParametros } from "./editor-parametros";

export const metadata: Metadata = { title: "Parámetros" };

async function Parametros() {
  const { organizacionId, rol } = await exigirSesion();
  if (!puede(rol, "configuracion.administrar")) {
    return <p role="alert">Solo un administrador puede cambiar los parámetros.</p>;
  }

  const datos = await conOrganizacion(organizacionId, async () => {
    const servicio = parametros();
    const [valores, catalogos, canales, festivos, perfil] = await Promise.all([
      servicio.obtenerVarios(CLAVES),
      db().valorCatalogo.findMany({ orderBy: [{ tipo: "asc" }, { orden: "asc" }] }),
      db().canalEnvio.findMany({ orderBy: { prioridad: "asc" } }),
      db().festivo.findMany({ orderBy: { fecha: "asc" } }),
      db().perfilOrganizacion.findFirst({ select: { pais: true } }),
    ]);
    return { valores, catalogos, canales, festivos, pais: perfil?.pais ?? "CO" };
  });

  const miembros = await dbPlataforma().member.findMany({
    where: { organizationId: organizacionId },
    select: { userId: true, role: true, user: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  const anio = new Date().getFullYear();
  const nacionales = datos.pais === "CO" ? [anio, anio + 1].flatMap(festivosColombia) : [];

  return (
    <EditorParametros
      parametros={CLAVES.map((clave) => {
        const { nombre, grupo, tipo, descripcion, editablePor } = DEFINICIONES[clave];
        return {
          clave,
          nombre,
          grupo,
          tipo,
          descripcion,
          editable: editablePor === "ADMIN",
          valor: datos.valores[clave],
        };
      })}
      catalogos={datos.catalogos.map((v) => ({
        id: v.id,
        tipo: v.tipo,
        codigo: v.codigo,
        etiqueta: v.etiqueta,
        activo: v.activo,
        esSistema: v.esSistema,
      }))}
      canales={datos.canales.map((c) => ({
        canal: c.canal,
        activo: c.activo,
        reintentos: c.reintentos,
        plantilla: c.plantilla,
        visibleEnCotizador: c.visibleEnCotizador,
      }))}
      festivos={datos.festivos.map((f) => ({
        id: f.id,
        fecha: f.fecha.toISOString().slice(0, 10),
        nombre: f.nombre,
      }))}
      festivosNacionales={nacionales}
      miembros={miembros.map((m) => ({ usuarioId: m.userId, nombre: m.user.name, rol: m.role }))}
    />
  );
}

export default function PaginaParametros() {
  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Parámetros</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Los valores con los que trabaja el CRM en tu organización. Cada cambio queda en la auditoría.
        </p>
      </header>
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <Parametros />
      </Suspense>
    </main>
  );
}
