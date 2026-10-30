import { type ComponentProps, type ReactNode } from "react";
import { cx } from "./variantes";

export function Tarjeta({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("rounded-lg border border-borde bg-superficie p-4", className)} {...props} />;
}

export function EncabezadoPagina({
  titulo,
  detalle,
  acciones,
}: {
  titulo: ReactNode;
  detalle?: ReactNode;
  acciones?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex flex-col gap-1">
        <h1 className="font-titulos text-2xl font-semibold tracking-wide">{titulo}</h1>
        {detalle ? <p className="text-sm text-texto-suave">{detalle}</p> : null}
      </div>
      {acciones ? <div className="flex gap-2">{acciones}</div> : null}
    </header>
  );
}
