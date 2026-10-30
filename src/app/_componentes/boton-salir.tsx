"use client";

import { authCliente } from "@/lib/auth/cliente";
import { navegarConRecarga } from "@/lib/auth/navegacion";

export function BotonSalir() {
  return (
    <button
      type="button"
      onClick={() =>
        void (async () => {
          await authCliente.signOut();
          navegarConRecarga("/ingresar");
        })()
      }
      className="text-sm text-violet-700 hover:underline dark:text-violet-300"
    >
      Cerrar sesión
    </button>
  );
}
