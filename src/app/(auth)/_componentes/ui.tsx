// Piezas de los formularios de acceso sobre los componentes base del sistema de diseño (#43).
import { type ComponentProps, type ReactNode } from "react";
import { Boton as BotonBase, Campo as CampoBase } from "@/components/ui";

export { Aviso, Cargando } from "@/components/ui";

export function Campo({
  etiqueta,
  id,
  ...props
}: { etiqueta: string; id: string } & ComponentProps<"input">) {
  return <CampoBase etiqueta={etiqueta} id={id} {...props} />;
}

export function Boton({ cargando, children, ...props }: { cargando?: boolean } & ComponentProps<"button">) {
  return (
    <BotonBase type="submit" cargando={cargando} {...props}>
      {children}
    </BotonBase>
  );
}

export function Titulo({ children, detalle }: { children: ReactNode; detalle?: ReactNode }) {
  return (
    <header className="flex flex-col gap-1">
      <h1 className="text-xl font-semibold">{children}</h1>
      {detalle ? <p className="text-sm text-texto-suave">{detalle}</p> : null}
    </header>
  );
}
