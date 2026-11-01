import { db } from "@/lib/db";

/** Líneas de servicio del diccionario de la organización activa. */
export function lineasDeServicio() {
  return db().valorCatalogo.findMany({
    where: { tipo: "LINEA_SERVICIO", activo: true },
    orderBy: { orden: "asc" },
    select: { id: true, etiqueta: true },
  });
}
