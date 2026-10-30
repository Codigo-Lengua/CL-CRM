import { Suspense } from "react";
import { exigirSesion } from "@/lib/auth/sesion";
import { BotonSalir } from "./_componentes/boton-salir";

// Inicio provisional: confirma quién entró, en qué organización y con qué rol.
// El tablero real llega con las pantallas del CRM.
async function Saludo() {
  const { nombre, rol } = await exigirSesion();
  return (
    <>
      <h1 className="text-2xl font-semibold">Hola, {nombre}</h1>
      <p className="text-zinc-600 dark:text-zinc-400">
        Ingresaste con el rol {rol}. Etapa 1 en construcción.
      </p>
      <BotonSalir />
    </>
  );
}

export default function Inicio() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center">
      <Suspense fallback={<p className="text-sm text-zinc-500">Cargando…</p>}>
        <Saludo />
      </Suspense>
    </main>
  );
}
