import Link from "next/link";
import { type ComponentProps } from "react";
import { variantes } from "./variantes";

export const clasesBoton = variantes(
  "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors disabled:pointer-events-none disabled:opacity-50",
  {
    variante: {
      primario: "bg-primario text-sobre-primario hover:bg-primario-hover",
      secundario: "border border-borde-control bg-superficie text-texto hover:bg-superficie-alta",
      fantasma: "text-enlace hover:bg-superficie-alta",
      peligro: "bg-peligro-fondo text-peligro hover:bg-superficie-alta",
    },
    tamano: { sm: "h-8 px-3 text-sm", md: "h-10 px-4 text-sm" },
  },
  { variante: "primario", tamano: "md" },
);

type Variantes = Parameters<typeof clasesBoton>[0];

export function Boton({
  variante,
  tamano,
  cargando,
  className,
  children,
  type = "button",
  ...props
}: NonNullable<Variantes> & { cargando?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type={type}
      disabled={cargando || props.disabled}
      aria-busy={cargando || undefined}
      className={clasesBoton({ variante, tamano }, className)}
      {...props}
    >
      {cargando ? "Un momento…" : children}
    </button>
  );
}

export function BotonEnlace({
  variante,
  tamano,
  className,
  ...props
}: NonNullable<Variantes> & ComponentProps<typeof Link>) {
  return <Link className={clasesBoton({ variante, tamano }, className)} {...props} />;
}
