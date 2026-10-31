import { type Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { type ReactNode, Suspense } from "react";
import {
  Aviso,
  BotonEnlace,
  Cargando,
  EncabezadoPagina,
  Insignia,
  SinPermiso,
  Tarjeta,
} from "@/components/ui";
import { puede } from "@/lib/permisos";
import { negociosDeEmpresa } from "@/modules/embudo/aplicacion/negocios";
import { obtenerEmpresa } from "@/modules/empresas/aplicacion/empresas";
import { puedeContactar } from "@/modules/empresas/dominio/contactabilidad";
import { opcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import { InsigniasEstado } from "../insignias";
import { comoActor } from "../sesion-comercial";
import { actorDe } from "../../negocios/sesion-embudo";
import { BotonNoContactar, BotonSuprimir, FormularioContacto } from "./acciones-ficha";
import { FormularioNegocio } from "./negocios-empresa";

export const metadata: Metadata = { title: "Empresa" };

type Props = { params: Promise<{ id: string }> };

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" });

function Dato({ etiqueta, children }: { etiqueta: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-texto-suave">{etiqueta}</dt>
      <dd className="text-sm break-words">{children || "—"}</dd>
    </div>
  );
}

async function Ficha({ params }: Props) {
  const { id } = await params;
  const resultado = await comoActor(async (actor, contexto) => {
    const actorEmbudo = actorDe(contexto);
    return {
      empresa: await obtenerEmpresa(actor, id),
      opciones: await opcionesEmpresa(contexto.organizacionId),
      negocios: actorEmbudo ? await negociosDeEmpresa(actorEmbudo, id) : null,
    };
  });
  if (!resultado) return <SinPermiso texto="Tu rol no tiene acceso a las empresas." />;
  const { empresa, opciones, negocios } = resultado.valor;
  if (!empresa) notFound();

  const esAdmin = puede(resultado.contexto.rol, "configuracion.administrar");
  const suprimida = Boolean(empresa.suprimidaEn);
  const asesor = opciones.asesores.find((a) => a.id === empresa.asesorId)?.etiqueta;
  const whatsapp = puedeContactar(empresa, "WHATSAPP");
  const llamada = puedeContactar(empresa, "LLAMADA");

  return (
    <div className="flex flex-col gap-6">
      <EncabezadoPagina
        titulo={
          <span className="flex flex-wrap items-center gap-2">
            {empresa.nombre}
            <InsigniasEstado empresa={empresa} />
          </span>
        }
        detalle={[empresa.categoria?.etiqueta, empresa.ciudad].filter(Boolean).join(" · ") || undefined}
        acciones={
          suprimida ? null : (
            <div className="flex flex-wrap gap-2">
              <BotonNoContactar empresaId={empresa.id} noContactar={empresa.noContactar} />
              <BotonEnlace href={`/empresas/${empresa.id}/editar`}>Editar</BotonEnlace>
            </div>
          )
        }
      />

      {suprimida ? (
        <Aviso tono="aviso">
          Los datos personales se suprimieron el {fecha.format(empresa.suprimidaEn!)}. Solo queda el nombre
          comercial.
        </Aviso>
      ) : !llamada.permitido ? (
        <Aviso tono="error">No contactar: {llamada.motivo}</Aviso>
      ) : !whatsapp.permitido ? (
        <Aviso tono="aviso">Sin WhatsApp: {whatsapp.motivo}</Aviso>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Tarjeta className="flex flex-col gap-4 lg:col-span-2">
          <h2 className="font-semibold">Datos</h2>
          <dl className="grid gap-4 sm:grid-cols-2">
            <Dato etiqueta="Teléfono">{empresa.telefono}</Dato>
            <Dato etiqueta="WhatsApp">{empresa.whatsapp}</Dato>
            <Dato etiqueta="Correo">{empresa.correo}</Dato>
            <Dato etiqueta="Sitio web">
              {empresa.sitioWeb ? (
                <a
                  href={empresa.sitioWeb}
                  target="_blank"
                  rel="noreferrer"
                  className="text-enlace hover:underline"
                >
                  {empresa.sitioWeb.replace(/^https?:\/\//, "")}
                </a>
              ) : null}
            </Dato>
            <Dato etiqueta="Instagram">{empresa.instagram}</Dato>
            <Dato etiqueta="Dirección">
              {[empresa.direccion, empresa.localidad].filter(Boolean).join(", ")}
            </Dato>
          </dl>
          {empresa.notas ? (
            <div className="flex flex-col gap-1">
              <h3 className="text-xs text-texto-suave">Notas</h3>
              <p className="text-sm whitespace-pre-line">{empresa.notas}</p>
            </div>
          ) : null}
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="font-semibold">Relación</h2>
          <dl className="grid gap-4">
            <Dato etiqueta="Asesor">
              {asesor
                ? `${asesor}${empresa.duenoDesde ? ` desde ${fecha.format(empresa.duenoDesde)}` : ""}`
                : "Sin asignar"}
            </Dato>
            <Dato etiqueta="Fuente">{empresa.fuente?.etiqueta}</Dato>
            <Dato etiqueta="Campaña">{empresa.campana}</Dato>
            <Dato etiqueta="Registrada">{fecha.format(empresa.creadoEn)}</Dato>
          </dl>
          {esAdmin && !suprimida ? (
            <div className="border-t border-borde pt-3">
              <BotonSuprimir empresaId={empresa.id} nombre={empresa.nombre} />
            </div>
          ) : null}
        </Tarjeta>
      </div>

      {negocios ? (
        <Tarjeta className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Negocios</h2>
            {suprimida ? null : <FormularioNegocio empresaId={empresa.id} />}
          </div>
          {negocios.length === 0 ? (
            <p className="text-sm text-texto-suave">
              Sin negocios. Crea uno cuando haya una oportunidad concreta.
            </p>
          ) : (
            <ul className="divide-y divide-borde">
              {negocios.map((n) => (
                <li key={n.id} className="flex items-center justify-between gap-2 py-2">
                  <Link href={`/negocios/${n.id}`} className="font-medium text-enlace hover:underline">
                    {n.nombre}
                  </Link>
                  <Insignia
                    tono={
                      n.etapa.tipoSistema === "PERDIDA"
                        ? "peligro"
                        : n.etapa.tipoSistema === "ABIERTA"
                          ? "primario"
                          : "exito"
                    }
                  >
                    {n.etapa.nombre}
                  </Insignia>
                </li>
              ))}
            </ul>
          )}
        </Tarjeta>
      ) : null}

      <Tarjeta className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Contactos</h2>
          {suprimida ? null : <FormularioContacto empresaId={empresa.id} />}
        </div>
        {empresa.contactos.length === 0 ? (
          <p className="text-sm text-texto-suave">
            Aún no hay contactos. Agrega a la persona con quien hablas.
          </p>
        ) : (
          <ul className="divide-y divide-borde">
            {empresa.contactos.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-2 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="flex items-center gap-2 font-medium">
                    {c.nombre}
                    {c.esPrincipal ? <Insignia tono="primario">Principal</Insignia> : null}
                  </span>
                  <span className="text-sm text-texto-suave">
                    {[c.cargo, c.telefono, c.correo].filter(Boolean).join(" · ") || "Sin datos de contacto"}
                  </span>
                </div>
                {c.autorizacionFecha ? (
                  <Insignia tono="exito" title={c.autorizacionOrigen ?? undefined}>
                    Autorizó datos el {fecha.format(c.autorizacionFecha)}
                  </Insignia>
                ) : (
                  <Insignia tono="neutro">Sin autorización registrada</Insignia>
                )}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </div>
  );
}

export default function PaginaEmpresa({ params }: Props) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Suspense fallback={<Cargando texto="Cargando empresa…" />}>
        <Ficha params={params} />
      </Suspense>
    </main>
  );
}
