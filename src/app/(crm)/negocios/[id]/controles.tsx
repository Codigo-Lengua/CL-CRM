"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import { Aviso, Boton, Campo, Dialogo, Selector, useToast } from "@/components/ui";
import {
  actualizarNegocioAccion,
  moverNegocioAccion,
  reabrirNegocioAccion,
  type Resultado,
} from "../acciones";

interface Destino {
  id: string;
  nombre: string;
  tipoSistema: "ABIERTA" | "GANADA" | "ENTREGADA" | "PERDIDA";
  permitido: boolean;
  motivo?: string;
}

/** Cambio de etapa (RN-21). Perder abre un diálogo con el motivo obligatorio (RN-22). */
export function MoverEtapa({
  negocioId,
  destinos,
  motivos,
}: {
  negocioId: string;
  destinos: Destino[];
  motivos: { id: string; etiqueta: string }[];
}) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  const [perdiendo, setPerdiendo] = useState<Destino | null>(null);
  const [error, setError] = useState<string | null>(null);
  const permitidos = destinos.filter((d) => d.permitido);
  const bloqueados = destinos.filter((d) => !d.permitido);

  function mover(destino: Destino, motivoPerdidaId?: string, nota?: string) {
    iniciar(async () => {
      const r = await moverNegocioAccion(negocioId, destino.id, motivoPerdidaId, nota);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setPerdiendo(null);
      setError(null);
      toast("ok", `Movido a ${destino.nombre}.`);
      router.refresh();
    });
  }

  function confirmarPerdida(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    mover(perdiendo!, String(datos.get("motivo") ?? ""), String(datos.get("nota") ?? ""));
  }

  return (
    <div className="flex flex-col gap-3">
      {permitidos.length === 0 ? (
        <p className="text-sm text-texto-suave">No tienes movimientos disponibles para este negocio.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {permitidos.map((d) => (
            <Boton
              key={d.id}
              tamano="sm"
              variante={
                d.tipoSistema === "PERDIDA"
                  ? "peligro"
                  : d.tipoSistema === "ABIERTA"
                    ? "secundario"
                    : "primario"
              }
              disabled={pendiente}
              onClick={() => (d.tipoSistema === "PERDIDA" ? setPerdiendo(d) : mover(d))}
            >
              {d.tipoSistema === "PERDIDA" ? "Marcar perdido" : d.nombre}
            </Boton>
          ))}
        </div>
      )}
      {error && !perdiendo ? <Aviso tono="error">{error}</Aviso> : null}
      {bloqueados.length > 0 ? (
        <details className="text-sm text-texto-suave">
          <summary className="cursor-pointer">Por qué no aparecen otras etapas</summary>
          <ul className="mt-2 flex flex-col gap-1">
            {bloqueados.map((d) => (
              <li key={d.id}>
                <span className="font-medium text-texto">{d.nombre}:</span> {d.motivo}
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <Dialogo
        abierto={perdiendo !== null}
        onCerrar={() => {
          setPerdiendo(null);
          setError(null);
        }}
        titulo="Marcar como perdido"
        acciones={
          <Boton type="submit" form="form-perdida" variante="peligro" cargando={pendiente}>
            Marcar perdido
          </Boton>
        }
      >
        <form id="form-perdida" onSubmit={confirmarPerdida} className="flex flex-col gap-3">
          {error ? <Aviso tono="error">{error}</Aviso> : null}
          <Selector etiqueta="Motivo" name="motivo" required defaultValue="">
            <option value="" disabled>
              Elige el motivo
            </option>
            {motivos.map((m) => (
              <option key={m.id} value={m.id}>
                {m.etiqueta}
              </option>
            ))}
          </Selector>
          <Campo etiqueta="Detalle (opcional)" name="nota" placeholder="Qué dijo el cliente" />
        </form>
      </Dialogo>
    </div>
  );
}

export function BotonReabrir({ negocioId }: { negocioId: string }) {
  const router = useRouter();
  const toast = useToast();
  const [pendiente, iniciar] = useTransition();
  return (
    <Boton
      variante="secundario"
      cargando={pendiente}
      onClick={() =>
        iniciar(async () => {
          const r = await reabrirNegocioAccion(negocioId);
          if (!r.ok) return toast("error", r.error);
          toast("ok", "Negocio reabierto.");
          router.refresh();
        })
      }
    >
      Reabrir negocio
    </Boton>
  );
}

export function EditarNegocio({
  negocioId,
  valores,
  asesores,
}: {
  negocioId: string;
  valores: { nombre: string; valorEstimado: string; cierreEstimado: string; asesorId: string };
  asesores: { id: string; etiqueta: string }[] | null;
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
        Editar datos
      </Boton>
    );

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await actualizarNegocioAccion(negocioId, datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", "Negocio actualizado.");
      setAbierto(false);
      router.refresh();
    });
  }

  return (
    <form onSubmit={enviar} noValidate className="flex flex-col gap-3">
      {resultado && !resultado.ok ? <Aviso tono="error">{resultado.error}</Aviso> : null}
      <Campo etiqueta="Descripción" name="nombre" defaultValue={valores.nombre} error={errores.nombre} />
      <Campo
        etiqueta="Valor estimado"
        name="valorEstimado"
        inputMode="numeric"
        defaultValue={valores.valorEstimado}
        error={errores.valorEstimado}
      />
      <Campo
        etiqueta="Cierre estimado"
        name="cierreEstimado"
        type="date"
        defaultValue={valores.cierreEstimado}
        error={errores.cierreEstimado}
      />
      {asesores ? (
        <Selector etiqueta="Asesor" name="asesorId" defaultValue={valores.asesorId}>
          {asesores.map((a) => (
            <option key={a.id} value={a.id}>
              {a.etiqueta}
            </option>
          ))}
        </Selector>
      ) : null}
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
