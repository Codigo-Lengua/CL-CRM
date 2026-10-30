"use client";

import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { navegarConRecarga } from "@/lib/auth/navegacion";
import { mensajeDeError } from "../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../_componentes/ui";
import { alEnviar } from "../_componentes/al-enviar";

export function FormularioDosPasos() {
  const [respaldo, setRespaldo] = useState(false);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function verificar(datos: FormData) {
    setCargando(true);
    setError("");
    const code = String(datos.get("codigo")).replace(/\s/g, "");
    const confiar = datos.get("confiar") === "on";
    const { error } = respaldo
      ? await authCliente.twoFactor.verifyBackupCode({ code, trustDevice: confiar })
      : await authCliente.twoFactor.verifyTotp({ code, trustDevice: confiar });
    setCargando(false);
    if (error) return setError(mensajeDeError(error));
    navegarConRecarga("/");
  }

  return (
    <form onSubmit={alEnviar(verificar)} className="flex flex-col gap-4">
      <Campo
        etiqueta={respaldo ? "Código de respaldo" : "Código de 6 dígitos"}
        id="codigo"
        inputMode={respaldo ? "text" : "numeric"}
        autoComplete="one-time-code"
        pattern={respaldo ? undefined : "[0-9 ]{6,7}"}
        required
        autoFocus
      />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="confiar" /> Confiar en este equipo por 30 días
      </label>
      <Aviso>{error}</Aviso>
      <Boton cargando={cargando}>Verificar</Boton>
      <button
        type="button"
        onClick={() => setRespaldo((r) => !r)}
        className="text-sm text-enlace hover:underline"
      >
        {respaldo ? "Usar el código de la app" : "No tengo el teléfono: usar un código de respaldo"}
      </button>
    </form>
  );
}
