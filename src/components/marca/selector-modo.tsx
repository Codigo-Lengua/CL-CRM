"use client";

import { useSyncExternalStore } from "react";

type Modo = "oscuro" | "claro";

const EVENTO = "cambio-de-modo";

function suscribir(avisar: () => void) {
  window.addEventListener(EVENTO, avisar);
  return () => window.removeEventListener(EVENTO, avisar);
}

const modoActual = (): Modo => (document.documentElement.dataset.tema === "claro" ? "claro" : "oscuro");

/** Cambia entre modo oscuro (el principal) y claro, y lo recuerda en este navegador. */
export function SelectorModo() {
  const modo = useSyncExternalStore<Modo>(suscribir, modoActual, () => "oscuro");

  function cambiar() {
    const siguiente: Modo = modo === "oscuro" ? "claro" : "oscuro";
    if (siguiente === "claro") document.documentElement.dataset.tema = "claro";
    else delete document.documentElement.dataset.tema;
    try {
      localStorage.setItem("tema", siguiente);
    } catch {
      // Sin almacenamiento (modo privado): el cambio dura hasta recargar.
    }
    window.dispatchEvent(new Event(EVENTO));
  }

  return (
    <button
      type="button"
      onClick={cambiar}
      aria-pressed={modo === "claro"}
      className="rounded-md px-2 py-1 text-sm text-texto-suave hover:bg-superficie-alta hover:text-texto"
    >
      {modo === "oscuro" ? "Modo claro" : "Modo oscuro"}
    </button>
  );
}
