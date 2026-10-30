import { type Metadata } from "next";
import { notFound } from "next/navigation";
import { Muestrario } from "./muestrario";

export const metadata: Metadata = { title: "Sistema de diseño" };

/** Todos los componentes base en modo oscuro y claro. Solo existe en desarrollo. */
export default function PaginaSistema() {
  if (process.env.NODE_ENV === "production") notFound();
  return <Muestrario />;
}
