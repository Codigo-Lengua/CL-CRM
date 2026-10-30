import { Suspense } from "react";
import { Cargando, EncabezadoPagina, Tarjeta } from "@/components/ui";
import { exigirSesion } from "@/lib/auth/sesion";
import { NOMBRE_ROL } from "@/lib/permisos";

// Inicio provisional: confirma quién entró y con qué rol. El tablero llega con las pantallas del CRM.
async function Saludo() {
  const { nombre, rol } = await exigirSesion();
  return (
    <>
      <EncabezadoPagina titulo={`Hola, ${nombre}`} detalle={`Ingresaste como ${NOMBRE_ROL[rol]}.`} />
      <Tarjeta>
        <p className="text-sm text-texto-suave">
          El tablero con tus leads, tareas y negocios aparece aquí cuando estén listas las pantallas
          comerciales.
        </p>
      </Tarjeta>
    </>
  );
}

export default function Inicio() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-6">
      <Suspense fallback={<Cargando />}>
        <Saludo />
      </Suspense>
    </main>
  );
}
