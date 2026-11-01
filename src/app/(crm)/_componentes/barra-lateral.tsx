import Image from "next/image";
import { BotonSalir } from "@/app/_componentes/boton-salir";
import { EstiloMarca } from "@/components/marca/estilo-marca";
import { SelectorModo } from "@/components/marca/selector-modo";
import { exigirSesion } from "@/lib/auth/sesion";
import { conOrganizacion } from "@/lib/db";
import { NOMBRE_ROL, type Permiso, puede } from "@/lib/permisos";
import { leerMarca } from "@/modules/marca/infraestructura/prisma";
import { EnlaceNavegacion } from "./enlace-navegacion";

interface Seccion {
  titulo?: string;
  enlaces: { href: string; nombre: string; permiso?: Permiso }[];
}

const SECCIONES: Seccion[] = [
  { enlaces: [{ href: "/", nombre: "Inicio" }] },
  {
    titulo: "Comercial",
    enlaces: [
      { href: "/empresas", nombre: "Empresas", permiso: "empresas.ver_editar" },
      { href: "/negocios", nombre: "Negocios", permiso: "negocios.mover" },
      { href: "/catalogo", nombre: "Catálogo" },
    ],
  },
  {
    titulo: "Configuración",
    enlaces: [
      { href: "/configuracion/equipo", nombre: "Equipo", permiso: "configuracion.administrar" },
      { href: "/configuracion/parametros", nombre: "Parámetros", permiso: "configuracion.administrar" },
      { href: "/configuracion/marca", nombre: "Marca", permiso: "configuracion.administrar" },
    ],
  },
];

/** Navegación del CRM con la marca de la organización activa. */
export async function BarraLateral() {
  const { nombre, rol, organizacionId } = await exigirSesion();
  const marca = await conOrganizacion(organizacionId, () => leerMarca());
  const secciones = SECCIONES.map((s) => ({
    ...s,
    enlaces: s.enlaces.filter((e) => !e.permiso || puede(rol, e.permiso)),
  })).filter((s) => s.enlaces.length > 0);

  return (
    <>
      <EstiloMarca marca={marca} />
      <aside className="flex shrink-0 flex-col gap-4 border-b border-borde bg-superficie p-3 md:sticky md:top-0 md:h-screen md:w-60 md:border-r md:border-b-0">
        <div className="flex items-center gap-3 px-1">
          <Image
            src={marca.logos.isotipo}
            alt=""
            width={36}
            height={36}
            className="rounded-full"
            unoptimized={marca.logos.isotipo.startsWith("https://")}
          />
          <span className="font-titulos text-sm font-semibold tracking-wider">{marca.nombreComercial}</span>
        </div>
        <nav
          aria-label="Principal"
          className="flex gap-1 overflow-x-auto md:flex-1 md:flex-col md:overflow-visible"
        >
          {secciones.map((s) => (
            <div key={s.titulo ?? "general"} className="flex gap-1 md:flex-col">
              {s.titulo ? (
                <p className="hidden px-3 pt-3 pb-1 text-xs font-semibold tracking-wide text-texto-suave uppercase md:block">
                  {s.titulo}
                </p>
              ) : null}
              {s.enlaces.map((e) => (
                <EnlaceNavegacion key={e.href} href={e.href}>
                  {e.nombre}
                </EnlaceNavegacion>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden flex-col gap-2 border-t border-borde pt-3 md:flex">
          <div className="px-1">
            <p className="truncate text-sm font-medium">{nombre}</p>
            <p className="text-xs text-texto-suave">{NOMBRE_ROL[rol]}</p>
          </div>
          <div className="flex items-center justify-between">
            <SelectorModo />
            <BotonSalir />
          </div>
        </div>
      </aside>
    </>
  );
}

export function BarraLateralCargando() {
  return (
    <aside aria-hidden className="border-b border-borde bg-superficie md:h-screen md:w-60 md:border-r" />
  );
}
