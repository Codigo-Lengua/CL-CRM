"use client";

import Link from "next/link";
import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { mensajeDeError } from "../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../_componentes/ui";
import { alEnviar } from "../_componentes/al-enviar";

export function FormularioRestablecer({ token }: { token: string }) {
  const [listo, setListo] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function guardar(datos: FormData) {
    const nueva = String(datos.get("contrasena"));
    if (nueva !== String(datos.get("confirmacion"))) return setError("Las contraseñas no coinciden.");
    setCargando(true);
    setError("");
    const { error } = await authCliente.resetPassword({ newPassword: nueva, token });
    setCargando(false);
    if (error) return setError(mensajeDeError(error));
    setListo(true);
  }

  if (listo) {
    return (
      <>
        <Aviso tipo="ok">Contraseña actualizada. Por seguridad se cerraron tus otras sesiones.</Aviso>
        <Link
          href="/ingresar"
          className="text-center text-sm text-violet-700 hover:underline dark:text-violet-300"
        >
          Ingresar
        </Link>
      </>
    );
  }
  return (
    <form onSubmit={alEnviar(guardar)} className="flex flex-col gap-4">
      <Campo
        etiqueta="Contraseña nueva"
        id="contrasena"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Campo
        etiqueta="Repítela"
        id="confirmacion"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
      />
      <Aviso>{error}</Aviso>
      <Boton cargando={cargando}>Guardar</Boton>
    </form>
  );
}
