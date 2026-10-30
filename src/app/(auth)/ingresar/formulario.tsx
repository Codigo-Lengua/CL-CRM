"use client";

import Link from "next/link";
import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { navegarConRecarga } from "@/lib/auth/navegacion";
import { mensajeDeError } from "../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../_componentes/ui";
import { alEnviar } from "../_componentes/al-enviar";

export function FormularioIngreso({ destino }: { destino: string }) {
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function ingresar(datos: FormData) {
    setCargando(true);
    setError("");
    const { data, error } = await authCliente.signIn.email({
      email: String(datos.get("email")),
      password: String(datos.get("contrasena")),
    });
    setCargando(false);
    if (error) return setError(mensajeDeError(error));
    // Con dos pasos activo, el cliente redirige a /dos-pasos (onTwoFactorRedirect).
    if (data && "twoFactorRedirect" in data && data.twoFactorRedirect) return;
    navegarConRecarga(destino);
  }

  return (
    <form onSubmit={alEnviar(ingresar)} className="flex flex-col gap-4">
      <Campo etiqueta="Correo" id="email" type="email" autoComplete="email" required autoFocus />
      <Campo etiqueta="Contraseña" id="contrasena" type="password" autoComplete="current-password" required />
      <Aviso>{error}</Aviso>
      <Boton cargando={cargando}>Ingresar</Boton>
      <Link href="/recuperar" className="text-center text-sm text-enlace hover:underline">
        Olvidé mi contraseña
      </Link>
    </form>
  );
}
