import { type FormEvent } from "react";

/**
 * Envía el formulario sin recargar y sin vaciarlo: con `action`, React limpia los campos
 * al terminar, y tras un error la persona tendría que volver a escribir su correo.
 */
export function alEnviar(manejar: (datos: FormData) => unknown) {
  return (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    void manejar(new FormData(evento.currentTarget));
  };
}
