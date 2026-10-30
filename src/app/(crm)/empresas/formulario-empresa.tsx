"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import { Aviso, Boton, BotonEnlace, Campo, Selector, Tarjeta, useToast } from "@/components/ui";
import type { OpcionesEmpresa } from "@/modules/empresas/infraestructura/prisma";
import type { Resultado } from "./acciones";

export interface ValoresEmpresa {
  nombre: string;
  categoriaId: string;
  fuenteId: string;
  asesorId: string;
  canal: string;
  origenDato: string;
  telefono: string;
  whatsapp: string;
  correo: string;
  direccion: string;
  localidad: string;
  ciudad: string;
  sitioWeb: string;
  instagram: string;
  campana: string;
  aceptaWhatsapp: boolean;
  notas: string;
}

const CANALES: Record<string, string> = {
  MANUAL: "Registro manual",
  WEB: "Formulario web",
  WHATSAPP: "WhatsApp",
  INSTAGRAM: "Instagram",
  MESSENGER: "Messenger",
  ANUNCIO: "Anuncio",
  GOOGLE_PLACES: "Google Maps",
};

const ORIGENES: Record<string, string> = {
  FORMULARIO: "La empresa nos escribió",
  REFERIDO: "Referido",
  VISITA: "Visita en persona",
  FUENTE_PUBLICA: "Fuente pública (Google, directorio…)",
  IMPORTACION: "Importación",
};

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <fieldset className="grid gap-4 sm:grid-cols-2">
      <legend className="mb-2 text-sm font-semibold tracking-wide text-texto-suave uppercase">
        {titulo}
      </legend>
      {children}
    </fieldset>
  );
}

export function FormularioEmpresa({
  valores,
  opciones,
  puedeAsignar,
  accion,
  cancelarHref,
  textoGuardar,
}: {
  valores: ValoresEmpresa;
  opciones: OpcionesEmpresa;
  puedeAsignar: boolean;
  accion: (formulario: FormData) => Promise<Resultado>;
  cancelarHref: string;
  textoGuardar: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await accion(formulario);
      setResultado(r);
      if (r.ok) {
        toast("ok", "Empresa guardada.");
        router.push(`/empresas/${r.id}`);
      }
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      {resultado && !resultado.ok ? (
        <Aviso tono={resultado.duplicado ? "aviso" : "error"}>
          {resultado.error}{" "}
          {resultado.duplicado ? (
            <Link href={`/empresas/${resultado.duplicado.empresaId}`} className="font-medium underline">
              Abrir {resultado.duplicado.nombre}
            </Link>
          ) : null}
        </Aviso>
      ) : null}

      <Tarjeta className="flex flex-col gap-6">
        <Grupo titulo="Negocio">
          <Campo
            etiqueta="Nombre comercial"
            name="nombre"
            required
            autoComplete="organization"
            defaultValue={valores.nombre}
            error={errores.nombre}
            className="sm:col-span-2"
          />
          <Selector etiqueta="Categoría" name="categoriaId" defaultValue={valores.categoriaId}>
            <option value="">Sin categoría</option>
            {opciones.categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.etiqueta}
              </option>
            ))}
          </Selector>
          {puedeAsignar ? (
            <Selector
              etiqueta="Asesor"
              name="asesorId"
              defaultValue={valores.asesorId}
              ayuda="Quien lleva la relación con la empresa."
            >
              <option value="">Sin asignar</option>
              {opciones.asesores.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.etiqueta}
                </option>
              ))}
            </Selector>
          ) : null}
        </Grupo>

        <Grupo titulo="Cómo contactarla">
          <Campo
            etiqueta="Teléfono"
            name="telefono"
            type="tel"
            inputMode="tel"
            defaultValue={valores.telefono}
            error={errores.telefono}
            ayuda="Con él se detectan empresas repetidas."
          />
          <Campo
            etiqueta="WhatsApp"
            name="whatsapp"
            type="tel"
            inputMode="tel"
            defaultValue={valores.whatsapp}
            error={errores.whatsapp}
          />
          <Campo
            etiqueta="Correo"
            name="correo"
            type="email"
            defaultValue={valores.correo}
            error={errores.correo}
          />
          <Campo
            etiqueta="Sitio web"
            name="sitioWeb"
            inputMode="url"
            placeholder="ejemplo.co"
            defaultValue={valores.sitioWeb}
            error={errores.sitioWeb}
          />
          <Campo
            etiqueta="Instagram"
            name="instagram"
            placeholder="@negocio"
            defaultValue={valores.instagram}
            error={errores.instagram}
          />
        </Grupo>

        <Grupo titulo="Ubicación">
          <Campo
            etiqueta="Dirección"
            name="direccion"
            autoComplete="street-address"
            defaultValue={valores.direccion}
            error={errores.direccion}
            className="sm:col-span-2"
          />
          <Campo etiqueta="Localidad o barrio" name="localidad" defaultValue={valores.localidad} />
          <Campo etiqueta="Ciudad" name="ciudad" defaultValue={valores.ciudad} />
        </Grupo>

        <Grupo titulo="Origen">
          <Selector etiqueta="Fuente" name="fuenteId" defaultValue={valores.fuenteId}>
            <option value="">Sin fuente</option>
            {opciones.fuentes.map((f) => (
              <option key={f.id} value={f.id}>
                {f.etiqueta}
              </option>
            ))}
          </Selector>
          <Selector etiqueta="Canal" name="canal" defaultValue={valores.canal}>
            {Object.entries(CANALES).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
          <Selector
            etiqueta="Origen del dato"
            name="origenDato"
            defaultValue={valores.origenDato}
            ayuda="Si viene de una fuente pública, no se le escribe por WhatsApp hasta que acepte."
          >
            {Object.entries(ORIGENES).map(([valor, texto]) => (
              <option key={valor} value={valor}>
                {texto}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Campaña" name="campana" defaultValue={valores.campana} />
          <label className="flex items-start gap-2 text-sm sm:col-span-2">
            <input
              type="checkbox"
              name="aceptaWhatsapp"
              defaultChecked={valores.aceptaWhatsapp}
              className="mt-0.5 size-4 accent-primario"
            />
            <span>
              Aceptó recibir mensajes por WhatsApp
              <span className="block text-xs text-texto-suave">Márcalo solo si lo dijo expresamente.</span>
            </span>
          </label>
        </Grupo>

        <label className="flex flex-col gap-1 text-sm font-medium">
          Notas
          <textarea
            name="notas"
            rows={4}
            defaultValue={valores.notas}
            className="rounded-md border border-borde-control bg-superficie p-3 text-sm font-normal"
          />
        </label>
      </Tarjeta>

      <div className="flex justify-end gap-2">
        <BotonEnlace variante="secundario" href={cancelarHref}>
          Cancelar
        </BotonEnlace>
        <Boton type="submit" cargando={pendiente}>
          {textoGuardar}
        </Boton>
      </div>
    </form>
  );
}
