"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { Boton } from "./boton";

/**
 * Diálogo modal sobre <dialog>: el navegador se encarga del foco, de Escape y de dejar
 * inerte el resto de la página.
 */
export function Dialogo({
  abierto,
  onCerrar,
  titulo,
  children,
  acciones,
}: {
  abierto: boolean;
  onCerrar: () => void;
  titulo: string;
  children: ReactNode;
  acciones?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialogo = ref.current;
    if (!dialogo) return;
    if (abierto && !dialogo.open) dialogo.showModal();
    if (!abierto && dialogo.open) dialogo.close();
  }, [abierto]);

  return (
    <dialog
      ref={ref}
      onClose={onCerrar}
      aria-labelledby="titulo-dialogo"
      className="m-auto w-full max-w-md rounded-lg border border-borde bg-superficie p-0 text-texto backdrop:bg-fondo/70"
    >
      <div className="flex flex-col gap-4 p-5">
        <h2 id="titulo-dialogo" className="text-lg font-semibold">
          {titulo}
        </h2>
        <div className="text-sm">{children}</div>
        <div className="flex justify-end gap-2">
          <Boton variante="secundario" onClick={onCerrar}>
            Cancelar
          </Boton>
          {acciones}
        </div>
      </div>
    </dialog>
  );
}
