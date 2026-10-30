import { type Metadata } from "next";
import { Titulo } from "../_componentes/ui";
import { FormularioRecuperar } from "./formulario";

export const metadata: Metadata = { title: "Recuperar contraseña" };

export default function PaginaRecuperar() {
  return (
    <>
      <Titulo detalle="Te enviaremos un enlace para crear una contraseña nueva.">Recuperar contraseña</Titulo>
      <FormularioRecuperar />
    </>
  );
}
