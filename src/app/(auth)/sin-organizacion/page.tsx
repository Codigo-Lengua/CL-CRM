import { type Metadata } from "next";
import { Aviso, Titulo } from "../_componentes/ui";
import { BotonSalir } from "@/app/_componentes/boton-salir";

export const metadata: Metadata = { title: "Sin organización" };

export default function PaginaSinOrganizacion() {
  return (
    <>
      <Titulo>No tienes una organización activa</Titulo>
      <Aviso>
        Tu usuario no pertenece a ninguna organización o te quitaron el acceso. Pide una invitación a un
        administrador.
      </Aviso>
      <BotonSalir />
    </>
  );
}
