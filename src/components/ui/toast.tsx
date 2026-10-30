"use client";

import { createContext, type ReactNode, useCallback, useContext, useState } from "react";
import { variantes } from "./variantes";

type Tono = "ok" | "error";
interface Mensaje {
  id: number;
  tono: Tono;
  texto: string;
}

const Contexto = createContext<(tono: Tono, texto: string) => void>(() => undefined);

const clasesToast = variantes(
  "pointer-events-auto rounded-md border px-4 py-3 text-sm shadow-lg",
  { tono: { ok: "border-exito bg-superficie text-texto", error: "border-peligro bg-superficie text-texto" } },
  { tono: "ok" },
);

const DURACION_MS = 4000;

/** Avisos flotantes para confirmar una acción sin mover el foco. */
export function ProveedorToasts({ children }: { children: ReactNode }) {
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);

  const mostrar = useCallback((tono: Tono, texto: string) => {
    const id = Date.now() + Math.random();
    setMensajes((actual) => [...actual, { id, tono, texto }]);
    setTimeout(() => setMensajes((actual) => actual.filter((m) => m.id !== id)), DURACION_MS);
  }, []);

  return (
    <Contexto.Provider value={mostrar}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-50 flex max-w-sm flex-col gap-2"
      >
        {mensajes.map((m) => (
          <p
            key={m.id}
            role={m.tono === "error" ? "alert" : "status"}
            className={clasesToast({ tono: m.tono })}
          >
            {m.texto}
          </p>
        ))}
      </div>
    </Contexto.Provider>
  );
}

export function useToast() {
  return useContext(Contexto);
}
