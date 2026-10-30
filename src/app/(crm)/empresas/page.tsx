import { type Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import {
  BotonEnlace,
  Cargando,
  clasesControl,
  EncabezadoPagina,
  EstadoVacio,
  SinPermiso,
  Tabla,
  Td,
  Th,
  Tr,
} from "@/components/ui";
import { listarEmpresas, TAMANO_PAGINA } from "@/modules/empresas/aplicacion/empresas";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { InsigniasEstado } from "./insignias";
import { comoActor } from "./sesion-comercial";

export const metadata: Metadata = { title: "Empresas" };

type Parametros = Promise<Record<string, string | string[] | undefined>>;

const uno = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

async function Lista({ searchParams }: { searchParams: Parametros }) {
  const p = await searchParams;
  const filtros = {
    q: uno(p.q),
    categoriaId: uno(p.categoria),
    asesorId: uno(p.asesor),
    pagina: Number(uno(p.pagina)) || 1,
  };
  const resultado = await comoActor(async (actor, contexto) => ({
    alcance: actor.alcance,
    lista: await listarEmpresas(actor, filtros),
    opciones: await opcionesEmpresa(contexto.organizacionId),
  }));
  if (!resultado) return <SinPermiso texto="Tu rol no tiene acceso a las empresas." />;
  const { alcance, lista, opciones } = resultado.valor;
  const nombreAsesor = new Map(opciones.asesores.map((a) => [a.id, a.etiqueta]));
  const hayFiltros = Boolean(filtros.q || filtros.categoriaId || filtros.asesorId);
  const paginas = Math.max(1, Math.ceil(lista.total / TAMANO_PAGINA));
  const enlacePagina = (n: number) => {
    const qs = new URLSearchParams();
    if (filtros.q) qs.set("q", filtros.q);
    if (filtros.categoriaId) qs.set("categoria", filtros.categoriaId);
    if (filtros.asesorId) qs.set("asesor", filtros.asesorId);
    qs.set("pagina", String(n));
    return `/empresas?${qs}`;
  };

  return (
    <div className="flex flex-col gap-4">
      <form role="search" className="flex flex-wrap items-end gap-2" action="/empresas">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
          Buscar
          <input
            name="q"
            type="search"
            defaultValue={filtros.q}
            placeholder="Nombre, contacto o teléfono"
            className={clasesControl}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Categoría
          <select name="categoria" defaultValue={filtros.categoriaId ?? ""} className={clasesControl}>
            <option value="">Todas</option>
            {opciones.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta}
              </option>
            ))}
          </select>
        </label>
        {alcance === "todos" ? (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Asesor
            <select name="asesor" defaultValue={filtros.asesorId ?? ""} className={clasesControl}>
              <option value="">Todos</option>
              <option value="sin-asignar">Sin asignar</option>
              {opciones.asesores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.etiqueta}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <button type="submit" className={`${clasesControl} font-medium hover:bg-superficie-alta`}>
          Filtrar
        </button>
      </form>

      {lista.empresas.length === 0 ? (
        <EstadoVacio
          titulo={hayFiltros ? "Nada coincide con la búsqueda" : "Todavía no hay empresas"}
          detalle={
            hayFiltros
              ? "Prueba con otro nombre o con el teléfono completo."
              : alcance === "todos"
                ? "Registra la primera empresa o espera los leads de la web."
                : "Aquí verás las empresas que tengas asignadas."
          }
          accion={hayFiltros ? null : <BotonEnlace href="/empresas/nueva">Nueva empresa</BotonEnlace>}
        />
      ) : (
        <>
          <p className="text-sm text-texto-suave" aria-live="polite">
            {lista.total === 1 ? "1 empresa" : `${lista.total} empresas`}
          </p>
          <Tabla>
            <thead>
              <tr>
                <Th>Empresa</Th>
                <Th>Categoría</Th>
                <Th>Ciudad</Th>
                <Th>Teléfono</Th>
                <Th>Contactos</Th>
                {alcance === "todos" ? <Th>Asesor</Th> : null}
                <Th>Estado</Th>
              </tr>
            </thead>
            <tbody>
              {lista.empresas.map((e) => (
                <Tr key={e.id}>
                  <Td>
                    <Link href={`/empresas/${e.id}`} className="font-medium text-enlace hover:underline">
                      {e.nombre}
                    </Link>
                  </Td>
                  <Td>{e.categoria?.etiqueta ?? "—"}</Td>
                  <Td>{e.ciudad ?? "—"}</Td>
                  <Td className="tabular-nums">{e.telefono ?? "—"}</Td>
                  <Td className="tabular-nums">{e._count.contactos}</Td>
                  {alcance === "todos" ? (
                    <Td>{e.asesorId ? (nombreAsesor.get(e.asesorId) ?? "—") : "Sin asignar"}</Td>
                  ) : null}
                  <Td>
                    <InsigniasEstado empresa={e} />
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Tabla>
          {paginas > 1 ? (
            <nav aria-label="Páginas" className="flex items-center justify-between text-sm">
              {lista.pagina > 1 ? (
                <BotonEnlace variante="secundario" tamano="sm" href={enlacePagina(lista.pagina - 1)}>
                  Anterior
                </BotonEnlace>
              ) : (
                <span />
              )}
              <span className="text-texto-suave">
                Página {lista.pagina} de {paginas}
              </span>
              {lista.pagina < paginas ? (
                <BotonEnlace variante="secundario" tamano="sm" href={enlacePagina(lista.pagina + 1)}>
                  Siguiente
                </BotonEnlace>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </div>
  );
}

export default function PaginaEmpresas({ searchParams }: { searchParams: Parametros }) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <EncabezadoPagina
        titulo="Empresas"
        detalle="Los negocios con que trabajamos y sus contactos."
        acciones={<BotonEnlace href="/empresas/nueva">Nueva empresa</BotonEnlace>}
      />
      <Suspense fallback={<Cargando texto="Cargando empresas…" />}>
        <Lista searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
