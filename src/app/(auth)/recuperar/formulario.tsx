"use client";

import Link from "next/link";
import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { mensajeDeError } from "../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../_componentes/ui";
import { alEnviar } from "../_componentes/al-enviar";

export function FormularioRecuperar() {
  const [enviado, setEnviado] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function pedir(datos: FormData) {
    setCargando(true);
    setError("");
    const { error } = await authCliente.requestPasswordReset({
      email: String(datos.get("email")),
      redirectTo: "/restablecer",
    });
    setCargando(false);
    if (error) return setError(mensajeDeError(error));
    setEnviado(true);
  }

  if (enviado) {
    return (
      <Aviso tipo="ok">
        Si el correo está registrado, te llegará un enlace para crear una contraseña nueva. Vence en una hora.
      </Aviso>
    );
  }
  return (
    <form onSubmit={alEnviar(pedir)} className="flex flex-col gap-4">
      <Campo etiqueta="Correo" id="email" type="email" autoComplete="email" required autoFocus />
      <Aviso>{error}</Aviso>
      <Boton cargando={cargando}>Enviar enlace</Boton>
      <Link
        href="/ingresar"
        className="text-center text-sm text-violet-700 hover:underline dark:text-violet-300"
      >
        Volver a ingresar
      </Link>
    </form>
  );
}
