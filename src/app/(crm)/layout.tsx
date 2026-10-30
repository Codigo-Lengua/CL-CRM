import { Suspense } from "react";
import { ProveedorToasts } from "@/components/ui";
import { BarraLateral, BarraLateralCargando } from "./_componentes/barra-lateral";

export default function LayoutCrm({ children }: LayoutProps<"/">) {
  return (
    <ProveedorToasts>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Suspense fallback={<BarraLateralCargando />}>
          <BarraLateral />
        </Suspense>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </ProveedorToasts>
  );
}
