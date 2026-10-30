import { type Metadata } from "next";
import { Titulo } from "../_componentes/ui";
import { FormularioDosPasos } from "./formulario";

export const metadata: Metadata = { title: "Verificación en dos pasos" };

export default function PaginaDosPasos() {
  return (
    <>
      <Titulo detalle="Escribe el código que muestra tu app de autenticación.">
        Verificación en dos pasos
      </Titulo>
      <FormularioDosPasos />
    </>
  );
}
