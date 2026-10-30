"use client";

import { type ReactNode, useId, useRef } from "react";
import { cx } from "./variantes";

/** Pestañas accesibles: flechas izquierda y derecha cambian de pestaña (patrón ARIA). */
export function Pestanas<T extends string>({
  opciones,
  activa,
  onCambiar,
  children,
}: {
  opciones: { id: T; nombre: string }[];
  activa: T;
  onCambiar: (id: T) => void;
  children: ReactNode;
}) {
  const base = useId();
  const botones = useRef<(HTMLButtonElement | null)[]>([]);

  function teclado(evento: React.KeyboardEvent, indice: number) {
    const delta = evento.key === "ArrowRight" ? 1 : evento.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    evento.preventDefault();
    const siguiente = (indice + delta + opciones.length) % opciones.length;
    onCambiar(opciones[siguiente]!.id);
    botones.current[siguiente]?.focus();
  }

  return (
    <div className="flex flex-col gap-6">
      <div role="tablist" className="flex gap-1 overflow-x-auto border-b border-borde">
        {opciones.map((o, i) => (
          <button
            key={o.id}
            ref={(b) => {
              botones.current[i] = b;
            }}
            type="button"
            role="tab"
            id={`${base}-${o.id}`}
            aria-selected={activa === o.id}
            aria-controls={`${base}-panel`}
            tabIndex={activa === o.id ? 0 : -1}
            onClick={() => onCambiar(o.id)}
            onKeyDown={(e) => teclado(e, i)}
            className={cx(
              "-mb-px border-b-2 px-3 py-2 text-sm font-medium whitespace-nowrap",
              activa === o.id
                ? "border-primario text-texto"
                : "border-transparent text-texto-suave hover:text-texto",
            )}
          >
            {o.nombre}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`${base}-panel`} aria-labelledby={`${base}-${activa}`}>
        {children}
      </div>
    </div>
  );
}
