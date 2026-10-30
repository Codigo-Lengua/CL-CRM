import { type ReactNode } from "react";

/** Lo que se ve cuando una lista no tiene datos: qué falta y qué hacer. */
export function EstadoVacio({
  titulo,
  detalle,
  accion,
}: {
  titulo: string;
  detalle?: ReactNode;
  accion?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-borde p-8 text-center">
      <p className="font-medium">{titulo}</p>
      {detalle ? <p className="text-sm text-texto-suave">{detalle}</p> : null}
      {accion}
    </div>
  );
}

export function Cargando({ texto = "Cargando…" }: { texto?: string }) {
  return (
    <p role="status" className="animate-pulse text-sm text-texto-suave">
      {texto}
    </p>
  );
}

export function SinPermiso({ texto }: { texto: string }) {
  return (
    <div role="alert" className="rounded-lg border border-borde bg-superficie p-6 text-sm text-texto-suave">
      {texto}
    </div>
  );
}
