// Piezas mínimas de los formularios de acceso. El sistema de diseño (#43) las reemplaza
// por los componentes base con la marca de cada organización.
import { type ComponentProps, type ReactNode } from "react";

export function Campo({
  etiqueta,
  id,
  ...props
}: { etiqueta: string; id: string } & ComponentProps<"input">) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1 text-sm font-medium">
      {etiqueta}
      <input
        id={id}
        name={id}
        className="rounded-md border border-zinc-300 bg-white px-3 py-2 text-base font-normal text-zinc-900 outline-none focus-visible:ring-2 focus-visible:ring-violet-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        {...props}
      />
    </label>
  );
}

export function Boton({ cargando, children, ...props }: { cargando?: boolean } & ComponentProps<"button">) {
  return (
    <button
      type="submit"
      disabled={cargando || props.disabled}
      aria-busy={cargando}
      className="rounded-md bg-violet-600 px-4 py-2 font-medium text-white hover:bg-violet-700 focus-visible:ring-2 focus-visible:ring-violet-400 focus-visible:outline-none disabled:opacity-60"
      {...props}
    >
      {cargando ? "Un momento…" : children}
    </button>
  );
}

export function Aviso({ tipo = "error", children }: { tipo?: "error" | "ok"; children: ReactNode }) {
  if (!children) return null;
  const estilo =
    tipo === "error"
      ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
      : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-200";
  return (
    <p
      role={tipo === "error" ? "alert" : "status"}
      className={`rounded-md border px-3 py-2 text-sm ${estilo}`}
    >
      {children}
    </p>
  );
}

export function Titulo({ children, detalle }: { children: ReactNode; detalle?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold">{children}</h1>
      {detalle ? <p className="text-sm text-zinc-600 dark:text-zinc-400">{detalle}</p> : null}
    </header>
  );
}

export function Cargando() {
  return (
    <p role="status" className="text-sm text-zinc-500">
      Cargando…
    </p>
  );
}
