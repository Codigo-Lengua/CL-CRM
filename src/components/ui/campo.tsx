import { type ComponentProps, type ReactNode, useId } from "react";
import { cx } from "./variantes";

export const clasesControl =
  "h-10 rounded-md border border-borde-control bg-superficie px-3 text-sm text-texto placeholder:text-texto-suave disabled:opacity-60 aria-[invalid=true]:border-peligro";

interface Rotulo {
  etiqueta: ReactNode;
  ayuda?: ReactNode;
  error?: string | null;
}

/** Etiqueta, control, ayuda y error enlazados por id para los lectores de pantalla. */
function Envoltura({
  id,
  etiqueta,
  ayuda,
  error,
  className,
  children,
}: Rotulo & { id: string; className?: string; children: ReactNode }) {
  return (
    <div className={cx("flex flex-col gap-1", className)}>
      <label htmlFor={id} className="text-sm font-medium">
        {etiqueta}
      </label>
      {children}
      {ayuda && !error ? (
        <p id={`${id}-ayuda`} className="text-xs text-texto-suave">
          {ayuda}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-xs text-peligro">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function descritoPor(id: string, { ayuda, error }: Rotulo) {
  return error ? `${id}-error` : ayuda ? `${id}-ayuda` : undefined;
}

export function Campo({
  etiqueta,
  ayuda,
  error,
  id,
  className,
  ...props
}: Rotulo & { className?: string } & ComponentProps<"input">) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <input
        id={idCampo}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(idCampo, { etiqueta, ayuda, error })}
        className={clasesControl}
        {...props}
      />
    </Envoltura>
  );
}

export function Selector({
  etiqueta,
  ayuda,
  error,
  id,
  className,
  children,
  ...props
}: Rotulo & { className?: string } & ComponentProps<"select">) {
  const generado = useId();
  const idCampo = id ?? generado;
  return (
    <Envoltura id={idCampo} etiqueta={etiqueta} ayuda={ayuda} error={error} className={className}>
      <select
        id={idCampo}
        name={props.name ?? id}
        aria-invalid={error ? true : undefined}
        aria-describedby={descritoPor(idCampo, { etiqueta, ayuda, error })}
        className={clasesControl}
        {...props}
      >
        {children}
      </select>
    </Envoltura>
  );
}
