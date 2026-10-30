import Image from "next/image";
import { MARCA_CODIGO_LENGUA } from "@/modules/marca/dominio/marca";

// Antes de ingresar no hay organización activa: se muestra la marca por defecto.
export default function LayoutAcceso({ children }: LayoutProps<"/">) {
  const marca = MARCA_CODIGO_LENGUA;
  return (
    <main className="flex flex-1 items-center justify-center bg-fondo p-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <Image
          src={marca.logos.logotipo}
          alt={marca.nombreComercial}
          width={200}
          height={60}
          priority
          className="h-auto w-48 rounded"
        />
        <section className="flex w-full flex-col gap-5 rounded-xl border border-borde bg-superficie p-6 shadow-lg">
          {children}
        </section>
      </div>
    </main>
  );
}
