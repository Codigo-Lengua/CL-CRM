"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Aviso, Boton, Campo, Dialogo, useToast } from "@/components/ui";
import { agregarContactoAccion, cambiarNoContactarAccion, type Resultado, suprimirAccion } from "../acciones";

/** RN-08: marcar o quitar "no contactar". */
export function BotonNoContactar({ empresaId, noContactar }: { empresaId: string; noContactar: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      variante={noContactar ? "secundario" : "peligro"}
      cargando={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await cambiarNoContactarAccion(empresaId, !noContactar);
          if (!r.ok) return toast("error", r.error);
          toast("ok", noContactar ? "Se puede volver a contactar." : "Marcada como no contactar.");
          router.refresh();
        })
      }
    >
      {noContactar ? "Quitar no contactar" : "Marcar no contactar"}
    </Boton>
  );
}

/** RN-47: suprimir datos personales, con confirmación porque no se puede deshacer. */
export function BotonSuprimir({ empresaId, nombre }: { empresaId: string; nombre: string }) {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [pendiente, iniciar] = useTransition();
  return (
    <>
      <Boton variante="fantasma" onClick={() => setAbierto(true)}>
        Suprimir datos personales
      </Boton>
      <Dialogo
        abierto={abierto}
        onCerrar={() => setAbierto(false)}
        titulo={`Suprimir datos de ${nombre}`}
        acciones={
          <Boton
            variante="peligro"
            cargando={pendiente}
            onClick={() =>
              iniciar(async () => {
                const r = await suprimirAccion(empresaId);
                if (!r.ok) return toast("error", r.error);
                setAbierto(false);
                toast("ok", "Datos personales suprimidos.");
                router.refresh();
              })
            }
          >
            Suprimir
          </Boton>
        }
      >
        <p>
          Se borran teléfonos, correos, dirección y notas de la empresa y de todos sus contactos, y queda
          marcada como no contactar. Se conservan el nombre comercial y lo contable.
        </p>
        <p className="mt-2 font-medium">No se puede deshacer.</p>
      </Dialogo>
    </>
  );
}

export function FormularioContacto({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [autorizo, setAutorizo] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};

  if (!abierto) {
    return (
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Agregar contacto
      </Boton>
    );
  }

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    iniciar(async () => {
      const r = await agregarContactoAccion(empresaId, datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", "Contacto agregado.");
      formulario.reset();
      setAutorizo(false);
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-4 rounded-md border border-borde p-4">
      <h3 className="font-semibold">Nuevo contacto</h3>
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
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo etiqueta="Nombre" name="nombre" required autoComplete="name" error={errores.nombre} />
        <Campo etiqueta="Cargo" name="cargo" placeholder="Dueña, administrador…" error={errores.cargo} />
        <Campo etiqueta="Teléfono" name="telefono" type="tel" inputMode="tel" error={errores.telefono} />
        <Campo etiqueta="Correo" name="correo" type="email" error={errores.correo} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="esPrincipal" className="size-4 accent-primario" />
        Contacto principal
      </label>
      <fieldset className="flex flex-col gap-3 rounded-md bg-superficie-alta p-3">
        <legend className="sr-only">Autorización de datos</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="checkbox"
            name="autorizo"
            checked={autorizo}
            onChange={(e) => setAutorizo(e.target.checked)}
            className="mt-0.5 size-4 accent-primario"
          />
          <span>
            Autorizó el tratamiento de sus datos
            <span className="block text-xs text-texto-suave">Queda la fecha de hoy como constancia.</span>
          </span>
        </label>
        {autorizo ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo
              etiqueta="Cómo lo autorizó"
              name="autorizacionOrigen"
              placeholder="Llamada, formulario, WhatsApp…"
              error={errores.autorizacionOrigen}
            />
            <Campo etiqueta="Texto o referencia" name="autorizacionTexto" error={errores.autorizacionTexto} />
          </div>
        ) : null}
      </fieldset>
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={pendiente}>
          Guardar contacto
        </Boton>
      </div>
    </form>
  );
}
