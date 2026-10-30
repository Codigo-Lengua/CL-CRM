import { type ComponentProps } from "react";
import { variantes } from "./variantes";

const clasesInsignia = variantes(
  "inline-flex items-center rounded px-1.5 py-0.5 text-xs font-medium",
  {
    tono: {
      neutro: "bg-superficie-alta text-texto-suave",
      primario: "bg-superficie-alta text-enlace",
      exito: "bg-exito-fondo text-exito",
      peligro: "bg-peligro-fondo text-peligro",
      aviso: "bg-aviso-fondo text-aviso",
    },
  },
  { tono: "neutro" },
);

export function Insignia({
  tono,
  className,
  ...props
}: NonNullable<Parameters<typeof clasesInsignia>[0]> & ComponentProps<"span">) {
  return <span className={clasesInsignia({ tono }, className)} {...props} />;
}
