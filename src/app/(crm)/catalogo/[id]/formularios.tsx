"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, type ReactNode, useState, useTransition } from "react";
import { Aviso, Boton, Campo, Selector, useToast } from "@/components/ui";
import {
  agregarCostoAccion,
  agregarPrecioAccion,
  asignarImpuestosAccion,
  eliminarCostoAccion,
  guardarPlanAccion,
  type Resultado,
} from "../acciones";

/** Un formulario que se abre con un botón, envía a una acción y refresca la ficha. */
function FormularioDesplegable({
  abrir,
  titulo,
  exito,
  accion,
  children,
}: {
  abrir: string;
  titulo: string;
  exito: string;
  accion: (datos: FormData) => Promise<Resultado>;
  children: (errores: Record<string, string>) => ReactNode;
}) {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};

  if (!abierto)
    return (
      <Boton variante="secundario" tamano="sm" onClick={() => setAbierto(true)}>
        {abrir}
      </Boton>
    );

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    iniciar(async () => {
      const r = await accion(datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", exito);
      formulario.reset();
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="flex w-full flex-col gap-3 rounded-md border border-borde p-4"
    >
      <h3 className="font-semibold">{titulo}</h3>
      {resultado && !resultado.ok ? <Aviso tono="error">{resultado.error}</Aviso> : null}
      {children(errores)}
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={pendiente}>
          Guardar
        </Boton>
      </div>
    </form>
  );
}

/** RN-27: un precio nuevo con su vigencia; el vigente sin fin se cierra el día anterior. */
export function FormularioPrecio({
  servicioId,
  planes,
  hoy,
}: {
  servicioId: string;
  planes: { id: string; nombre: string }[];
  hoy: string;
}) {
  return (
    <FormularioDesplegable
      abrir="Nuevo precio"
      titulo="Nuevo precio"
      exito="Precio agregado."
      accion={(d) => agregarPrecioAccion(servicioId, d)}
    >
      {(errores) => (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            {planes.length ? (
              <Selector etiqueta="Plan" name="planId" error={errores.planId} className="sm:col-span-2">
                {planes.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nombre}
                  </option>
                ))}
              </Selector>
            ) : null}
            <Campo
              etiqueta="Valor"
              name="valor"
              inputMode="numeric"
              placeholder="1.200.000"
              error={errores.valor}
            />
            <Campo
              etiqueta="Vigente desde"
              name="desde"
              type="date"
              defaultValue={hoy}
              error={errores.desde}
            />
            <Campo
              etiqueta="Vigente hasta (opcional)"
              name="hasta"
              type="date"
              error={errores.hasta}
              ayuda="Vacío: sin fecha de fin."
            />
          </div>
          <p className="text-xs text-texto-suave">
            El precio anterior no se borra: si estaba vigente sin fecha de fin, se cierra el día anterior.
          </p>
        </>
      )}
    </FormularioDesplegable>
  );
}

export function FormularioPlan({ servicioId }: { servicioId: string }) {
  return (
    <FormularioDesplegable
      abrir="Nuevo plan"
      titulo="Nuevo plan"
      exito="Plan agregado."
      accion={(d) => {
        d.set("activo", "on");
        return guardarPlanAccion(servicioId, d);
      }}
    >
      {(errores) => (
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo
            etiqueta="Nombre"
            name="nombre"
            placeholder="Básico, Estándar, Pro…"
            error={errores.nombre}
          />
          <Campo
            etiqueta="Límite de uso (opcional)"
            name="limiteUso"
            inputMode="numeric"
            error={errores.limiteUso}
            ayuda="Por ejemplo, conversaciones al mes."
          />
        </div>
      )}
    </FormularioDesplegable>
  );
}

export function FormularioCosto({ servicioId }: { servicioId: string }) {
  return (
    <FormularioDesplegable
      abrir="Agregar costo"
      titulo="Costo de terceros"
      exito="Costo agregado."
      accion={(d) => agregarCostoAccion(servicioId, d)}
    >
      {(errores) => (
        <div className="grid gap-3 sm:grid-cols-3">
          <Campo
            etiqueta="Concepto"
            name="concepto"
            placeholder="Hosting, dominio…"
            error={errores.concepto}
          />
          <Campo etiqueta="Valor" name="valor" inputMode="numeric" error={errores.valor} />
          <Selector etiqueta="Periodicidad" name="periodicidad" defaultValue="MENSUAL">
            <option value="UNICO">Único</option>
            <option value="MENSUAL">Mensual</option>
            <option value="ANUAL">Anual</option>
          </Selector>
        </div>
      )}
    </FormularioDesplegable>
  );
}

export function BotonEliminarCosto({ servicioId, costoId }: { servicioId: string; costoId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      variante="fantasma"
      tamano="sm"
      cargando={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await eliminarCostoAccion(servicioId, costoId);
          if (!r.ok) return toast("error", r.error);
          router.refresh();
        })
      }
    >
      Quitar
    </Boton>
  );
}

/** Impuestos que aplican al servicio (RN-30). */
export function ImpuestosDelServicio({
  servicioId,
  impuestos,
  asignados,
}: {
  servicioId: string;
  impuestos: { id: string; nombre: string; codigo: string; porcentaje: number; activo: boolean }[];
  asignados: string[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();

  if (impuestos.length === 0) {
    return <p className="text-sm text-texto-suave">No hay impuestos configurados en la organización.</p>;
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await asignarImpuestosAccion(servicioId, datos);
      if (!r.ok) return toast("error", r.error);
      toast("ok", "Impuestos guardados.");
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Impuestos que aplican</legend>
        {impuestos.map((i) => (
          <label key={i.id} className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="impuesto"
              value={i.id}
              defaultChecked={asignados.includes(i.id)}
              className="size-4 accent-primario"
            />
            {i.nombre} ({i.porcentaje} %){i.activo ? "" : " · inactivo"}
          </label>
        ))}
      </fieldset>
      <div>
        <Boton type="submit" tamano="sm" variante="secundario" cargando={pendiente}>
          Guardar impuestos
        </Boton>
      </div>
    </form>
  );
}
