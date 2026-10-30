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
      className="rounded-md px-2 py-1 text-sm text-enlace hover:bg-superficie-alta"
    >
      Cerrar sesión
    </button>
  );
}
