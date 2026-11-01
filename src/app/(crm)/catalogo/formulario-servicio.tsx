"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Aviso, Boton, BotonEnlace, Campo, Selector, Tarjeta, useToast } from "@/components/ui";
import { guardarServicioAccion, type Resultado } from "./acciones";

export interface ValoresServicio {
  codigo: string;
  nombre: string;
  lineaId: string;
  tipo: "PROYECTO" | "MENSUAL";
  incluye: string;
  entregaDias: string;
  horas: string;
  visibleWeb: boolean;
  requiereCotizacionManual: boolean;
  activo: boolean;
}

function Casilla({
  nombre,
  etiqueta,
  ayuda,
  marcada,
}: {
  nombre: string;
  etiqueta: string;
  ayuda: string;
  marcada: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input
        type="checkbox"
        name={nombre}
        defaultChecked={marcada}
        className="mt-0.5 size-4 accent-primario"
      />
      <span>
        {etiqueta}
        <span className="block text-xs text-texto-suave">{ayuda}</span>
      </span>
    </label>
  );
}

export function FormularioServicio({
  id,
  valores,
  lineas,
}: {
  id: string | null;
  valores: ValoresServicio;
  lineas: { id: string; etiqueta: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await guardarServicioAccion(id, datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", "Servicio guardado.");
      router.push(`/catalogo/${r.id}`);
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-6">
      {resultado && !resultado.ok ? <Aviso tono="error">{resultado.error}</Aviso> : null}
      <Tarjeta className="grid gap-4 sm:grid-cols-2">
        <Campo
          etiqueta="Nombre"
          name="nombre"
          defaultValue={valores.nombre}
          error={errores.nombre}
          className="sm:col-span-2"
        />
        <Campo
          etiqueta="Código"
          name="codigo"
          defaultValue={valores.codigo}
          error={errores.codigo}
          ayuda="Interno y único, por ejemplo WEB_BASICA."
        />
        <Selector etiqueta="Línea" name="lineaId" defaultValue={valores.lineaId}>
          <option value="">Sin línea</option>
          {lineas.map((l) => (
            <option key={l.id} value={l.id}>
              {l.etiqueta}
            </option>
          ))}
        </Selector>
        <Selector
          etiqueta="Tipo"
          name="tipo"
          defaultValue={valores.tipo}
          error={errores.tipo}
          ayuda="Los mensuales pueden tener planes con su propio precio."
        >
          <option value="PROYECTO">Proyecto (pago único)</option>
          <option value="MENSUAL">Mensual</option>
        </Selector>
        <div className="grid grid-cols-2 gap-4">
          <Campo
            etiqueta="Entrega (días)"
            name="entregaDias"
            inputMode="numeric"
            defaultValue={valores.entregaDias}
            error={errores.entregaDias}
          />
          <Campo
            etiqueta="Horas"
            name="horas"
            inputMode="numeric"
            defaultValue={valores.horas}
            error={errores.horas}
          />
        </div>
        <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
          Qué incluye
          <textarea
            name="incluye"
            rows={5}
            defaultValue={valores.incluye}
            className="rounded-md border border-borde-control bg-superficie p-3 text-sm font-normal"
          />
          <span className="text-xs font-normal text-texto-suave">Aparece en el PDF de la cotización.</span>
        </label>
        <div className="flex flex-col gap-3 sm:col-span-2">
          <Casilla
            nombre="activo"
            etiqueta="Activo"
            ayuda="Un servicio inactivo no se cotiza."
            marcada={valores.activo}
          />
          <Casilla
            nombre="visibleWeb"
            etiqueta="Visible en el sitio web"
            ayuda="Aparece en el cotizador público."
            marcada={valores.visibleWeb}
          />
          <Casilla
            nombre="requiereCotizacionManual"
            etiqueta="Requiere cotización manual"
            ayuda="Sin precio automático: la solicitud va directo al asesor."
            marcada={valores.requiereCotizacionManual}
          />
        </div>
      </Tarjeta>
      <div className="flex justify-end gap-2">
        <BotonEnlace variante="secundario" href={id ? `/catalogo/${id}` : "/catalogo"}>
          Cancelar
        </BotonEnlace>
        <Boton type="submit" cargando={pendiente}>
          Guardar servicio
        </Boton>
      </div>
    </form>
  );
}
