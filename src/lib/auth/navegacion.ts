"use client";

/**
 * Navegación completa después de un cambio de sesión (ingresar, salir, dos pasos,
 * aceptar invitación). El router de Next guarda en memoria las rutas ya visitadas, que
 * se renderizaron con la sesión anterior; recargar evita mostrar ese estado viejo.
 */
export function navegarConRecarga(ruta: string) {
  window.location.assign(ruta);
}
