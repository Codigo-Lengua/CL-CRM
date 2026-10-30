import { type ReactNode } from "react";
import { variantes } from "./variantes";

const clasesAviso = variantes(
  "rounded-md border px-3 py-2 text-sm",
  {
    tono: {
      error: "border-peligro bg-peligro-fondo text-peligro",
      ok: "border-exito bg-exito-fondo text-exito",
      aviso: "border-aviso bg-aviso-fondo text-aviso",
    },
  },
  { tono: "error" },
);

/** Mensaje en línea. Los errores se anuncian de inmediato; los demás, sin interrumpir. */
export function Aviso({
  tono = "error",
  children,
}: {
  tono?: "error" | "ok" | "aviso";
  children: ReactNode;
}) {
  if (!children) return null;
  return (
    <p role={tono === "error" ? "alert" : "status"} className={clasesAviso({ tono })}>
      {children}
    </p>
  );
}
