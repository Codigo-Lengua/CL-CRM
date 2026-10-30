"use client";

import QRCode from "qrcode";
import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { navegarConRecarga } from "@/lib/auth/navegacion";
import { mensajeDeError } from "../../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../../_componentes/ui";
import { alEnviar } from "../../_componentes/al-enviar";

type Paso = { paso: "contrasena" } | { paso: "escanear"; qr: string; secreto: string; respaldo: string[] };

export function AsistenteDosPasos({ obligatorio }: { obligatorio: boolean }) {
  const [estado, setEstado] = useState<Paso>({ paso: "contrasena" });
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function activar(datos: FormData) {
    setCargando(true);
    setError("");
    const { data, error } = await authCliente.twoFactor.enable({ password: String(datos.get("contrasena")) });
    if (error || data?.method !== "totp") {
      setCargando(false);
      return setError(mensajeDeError(error));
    }
    const qr = await QRCode.toDataURL(data.totpURI, { margin: 1, width: 200 });
    const secreto = new URL(data.totpURI).searchParams.get("secret") ?? "";
    setCargando(false);
    setEstado({ paso: "escanear", qr, secreto, respaldo: data.backupCodes });
  }

  async function confirmar(datos: FormData) {
    setCargando(true);
    setError("");
    const { error } = await authCliente.twoFactor.verifyTotp({
      code: String(datos.get("codigo")).replace(/\s/g, ""),
    });
    setCargando(false);
    if (error) return setError(mensajeDeError(error));
    navegarConRecarga("/");
  }

  if (estado.paso === "contrasena") {
    return (
      <form onSubmit={alEnviar(activar)} className="flex flex-col gap-4">
        {obligatorio ? (
          <Aviso tipo="ok">Tu rol exige verificación en dos pasos. Actívala para continuar.</Aviso>
        ) : null}
        <Campo
          etiqueta="Confirma tu contraseña"
          id="contrasena"
          type="password"
          autoComplete="current-password"
          required
        />
        <Aviso>{error}</Aviso>
        <Boton cargando={cargando}>Continuar</Boton>
      </form>
    );
  }

  return (
    <form onSubmit={alEnviar(confirmar)} className="flex flex-col gap-4">
      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm">
        <li>
          Escanea el código con Google Authenticator, Microsoft Authenticator o 1Password.
          {/* eslint-disable-next-line @next/next/no-img-element -- es un data URL generado aquí. */}
          <img
            src={estado.qr}
            alt="Código QR para la app de autenticación"
            className="mt-2 rounded bg-white p-2"
            width={200}
            height={200}
          />
          <span className="mt-1 block text-xs text-zinc-500">
            ¿No puedes escanear? Clave: <code className="break-all select-all">{estado.secreto}</code>
          </span>
        </li>
        <li>
          Guarda estos códigos de respaldo en un lugar seguro. Cada uno sirve una sola vez.
          <ul className="mt-2 grid grid-cols-2 gap-1 rounded bg-zinc-100 p-2 font-mono text-xs dark:bg-zinc-800">
            {estado.respaldo.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </li>
        <li>Escribe el código de 6 dígitos que muestra la app.</li>
      </ol>
      <Campo etiqueta="Código" id="codigo" inputMode="numeric" autoComplete="one-time-code" required />
      <Aviso>{error}</Aviso>
      <Boton cargando={cargando}>Activar</Boton>
    </form>
  );
}
