"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";
import {
  Aviso,
  Boton,
  Campo,
  Insignia,
  Selector,
  Tabla,
  Tarjeta,
  Td,
  Th,
  Tr,
  useToast,
} from "@/components/ui";
import { guardarImpuestoAccion, type Resultado } from "../acciones";

export interface FilaImpuesto {
  id: string;
  codigo: string;
  nombre: string;
  tipo: "TRASLADADO" | "RETENIDO";
  porcentaje: number;
  incluidoEnPrecio: boolean;
  desde: string;
  hasta: string | null;
  activo: boolean;
  servicios: number;
}

export function EditorImpuestos({ impuestos, hoy }: { impuestos: FilaImpuesto[]; hoy: string }) {
  const router = useRouter();
  const toast = useToast();
  const [editando, setEditando] = useState<FilaImpuesto | "nuevo" | null>(null);
  const [resultado, setResultado] = useState<Resultado | null>(null);
  const [pendiente, iniciar] = useTransition();
  const errores = resultado && !resultado.ok ? (resultado.errores ?? {}) : {};
  const actual = editando && editando !== "nuevo" ? editando : null;

  function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const datos = new FormData(evento.currentTarget);
    iniciar(async () => {
      const r = await guardarImpuestoAccion(actual?.id ?? null, datos);
      setResultado(r);
      if (!r.ok) return;
      toast("ok", "Impuesto guardado.");
      setEditando(null);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {impuestos.length === 0 ? (
        <Aviso tono="aviso">
          No hay impuestos. Si la organización no está obligada a cobrarlos, no hace falta configurar ninguno.
        </Aviso>
      ) : (
        <Tabla>
          <thead>
            <tr>
              <Th>Impuesto</Th>
              <Th>Tipo</Th>
              <Th className="text-right">Porcentaje</Th>
              <Th>Vigencia</Th>
              <Th>Servicios</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {impuestos.map((i) => (
              <Tr key={i.id}>
                <Td>
                  <span className="font-medium">{i.nombre}</span>
                  <span className="block text-xs text-texto-suave">{i.codigo}</span>
                </Td>
                <Td>
                  {i.tipo === "TRASLADADO" ? "Se suma" : "Se retiene"}
                  {i.incluidoEnPrecio ? (
                    <span className="block text-xs text-texto-suave">Incluido en el precio</span>
                  ) : null}
                </Td>
                <Td className="text-right tabular-nums">{i.porcentaje} %</Td>
                <Td>
                  {i.desde} — {i.hasta ?? "sin fin"} {!i.activo ? <Insignia>Inactivo</Insignia> : null}
                </Td>
                <Td className="tabular-nums">{i.servicios}</Td>
                <Td>
                  <Boton variante="fantasma" tamano="sm" onClick={() => (setResultado(null), setEditando(i))}>
                    Editar
                  </Boton>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Tabla>
      )}

      {editando ? (
        <Tarjeta>
          <form key={actual?.id ?? "nuevo"} onSubmit={enviar} noValidate className="flex flex-col gap-4">
            <h2 className="font-semibold">{actual ? `Editar ${actual.nombre}` : "Nuevo impuesto"}</h2>
            {resultado && !resultado.ok ? <Aviso tono="error">{resultado.error}</Aviso> : null}
            <div className="grid gap-4 sm:grid-cols-3">
              <Campo etiqueta="Nombre" name="nombre" defaultValue={actual?.nombre} error={errores.nombre} />
              <Campo
                etiqueta="Código"
                name="codigo"
                defaultValue={actual?.codigo}
                placeholder="IVA19"
                error={errores.codigo}
              />
              <Campo
                etiqueta="Porcentaje"
                name="porcentaje"
                inputMode="decimal"
                defaultValue={actual?.porcentaje.toString()}
                error={errores.porcentaje}
              />
              <Selector etiqueta="Tipo" name="tipo" defaultValue={actual?.tipo ?? "TRASLADADO"}>
                <option value="TRASLADADO">Se suma al total</option>
                <option value="RETENIDO">Se retiene (se resta)</option>
              </Selector>
              <Campo
                etiqueta="Vigente desde"
                name="desde"
                type="date"
                defaultValue={actual?.desde ?? hoy}
                error={errores.desde}
              />
              <Campo
                etiqueta="Vigente hasta (opcional)"
                name="hasta"
                type="date"
                defaultValue={actual?.hasta ?? ""}
                error={errores.hasta}
              />
            </div>
            <div className="flex flex-col gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="incluidoEnPrecio"
                  defaultChecked={actual?.incluidoEnPrecio}
                  className="size-4 accent-primario"
                />
                El precio del catálogo ya lo incluye
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="activo"
                  defaultChecked={actual?.activo ?? true}
                  className="size-4 accent-primario"
                />
                Activo
              </label>
            </div>
            <div className="flex justify-end gap-2">
              <Boton variante="secundario" onClick={() => setEditando(null)}>
                Cancelar
              </Boton>
              <Boton type="submit" cargando={pendiente}>
                Guardar impuesto
              </Boton>
            </div>
          </form>
        </Tarjeta>
      ) : (
        <div>
          <Boton onClick={() => (setResultado(null), setEditando("nuevo"))}>Nuevo impuesto</Boton>
        </div>
      )}
    </div>
  );
}
