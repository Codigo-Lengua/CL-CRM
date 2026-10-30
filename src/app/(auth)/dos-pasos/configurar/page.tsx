import { type Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { leerSesion } from "@/lib/auth/sesion";
import { Cargando, Titulo } from "../../_componentes/ui";
import { AsistenteDosPasos } from "./asistente";

export const metadata: Metadata = { title: "Activar verificación en dos pasos" };

async function Asistente() {
  const sesion = await leerSesion();
  if (sesion.estado === "sin-sesion") redirect("/ingresar?destino=/dos-pasos/configurar");
  return <AsistenteDosPasos obligatorio={sesion.estado === "configurar-dos-pasos"} />;
}

export default function PaginaConfigurarDosPasos() {
  return (
    <>
      <Titulo>Activar verificación en dos pasos</Titulo>
      <Suspense fallback={<Cargando />}>
        <Asistente />
      </Suspense>
    </>
  );
}
