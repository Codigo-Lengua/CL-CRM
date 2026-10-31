"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Aviso, Boton, Campo, useToast } from "@/components/ui";
import { crearNegocioAccion, type Resultado } from "../../negocios/acciones";

/** Crear un negocio desde la ficha de la empresa (D-14: uno abierto a la vez). */
export function FormularioNegocio({ empresaId }: { empresaId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [abierto, setAbierto] = useState(false);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};

  if (!abierto)
    return (
      <Boton variante="secundario" onClick={() => setAbierto(true)}>
        Crear negocio
      </Boton>
    );

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await crearNegocioAccion(empresaId, datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", "Negocio creado.");
      router.push(`/negocios/${r.id}`);
    });
  }

  return (
    <form
      onSubmit={enviar}
      noValidate
      className="flex w-full flex-col gap-4 rounded-md border border-borde p-4"
    >
      <h3 className="font-semibold">Nuevo negocio</h3>
      {resultado && !resultado.ok ? (
        <Aviso tono={resultado.existente ? "aviso" : "error"}>
          {resultado.error}{" "}
          {resultado.existente ? (
            <Link href={`/negocios/${resultado.existente.id}`} className="font-medium underline">
              Abrirlo
            </Link>
          ) : null}
        </Aviso>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-3">
        <Campo
          etiqueta="Descripción"
          name="nombre"
          placeholder="Página web, bot de citas…"
          error={errores.nombre}
          className="sm:col-span-3"
        />
        <Campo
          etiqueta="Valor estimado"
          name="valorEstimado"
          inputMode="numeric"
          placeholder="1.200.000"
          error={errores.valorEstimado}
        />
        <Campo etiqueta="Cierre estimado" name="cierreEstimado" type="date" error={errores.cierreEstimado} />
      </div>
      <div className="flex justify-end gap-2">
        <Boton variante="secundario" onClick={() => setAbierto(false)}>
          Cancelar
        </Boton>
        <Boton type="submit" cargando={pendiente}>
          Crear negocio
        </Boton>
      </div>
    </form>
  );
}
