"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authCliente } from "@/lib/auth/cliente";
import { navegarConRecarga } from "@/lib/auth/navegacion";
import { mensajeDeError } from "../../_componentes/mensajes";
import { Aviso, Boton, Campo } from "../../_componentes/ui";
import { alEnviar } from "../../_componentes/al-enviar";

export interface DatosInvitacion {
  id: string;
  organizacionId: string;
  email: string;
  /** Correo de la sesión abierta en este navegador, si hay una. */
  sesionEmail: string | null;
  cuentaExiste: boolean;
}

export function AceptarInvitacion({ invitacion }: { invitacion: DatosInvitacion }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  async function aceptar() {
    const { error } = await authCliente.organization.acceptInvitation({ invitationId: invitacion.id });
    if (error) return setError(mensajeDeError(error));
    await authCliente.organization.setActive({ organizationId: invitacion.organizacionId });
    navegarConRecarga("/");
  }

  async function registrarYAceptar(datos: FormData) {
    const contrasena = String(datos.get("contrasena"));
    if (contrasena !== String(datos.get("confirmacion"))) return setError("Las contraseñas no coinciden.");
    setCargando(true);
    setError("");
    const { error } = await authCliente.signUp.email({
      email: invitacion.email,
      password: contrasena,
      name: String(datos.get("nombre")).trim(),
    });
    if (error) {
      setCargando(false);
      return setError(mensajeDeError(error));
    }
    await aceptar();
    setCargando(false);
  }

  if (invitacion.sesionEmail && invitacion.sesionEmail !== invitacion.email) {
    return (
      <>
        <Aviso>
          Esta invitación es para {invitacion.email}, pero ingresaste como {invitacion.sesionEmail}.
        </Aviso>
        <button
          type="button"
          onClick={() =>
            void (async () => {
              await authCliente.signOut();
              router.refresh();
            })()
          }
          className="text-sm text-violet-700 hover:underline dark:text-violet-300"
        >
          Cerrar sesión y continuar
        </button>
      </>
    );
  }

  if (invitacion.sesionEmail) {
    return (
      <form
        action={async () => {
          setCargando(true);
          await aceptar();
          setCargando(false);
        }}
        className="flex flex-col gap-4"
      >
        <Aviso>{error}</Aviso>
        <Boton cargando={cargando}>Aceptar invitación</Boton>
      </form>
    );
  }

  if (invitacion.cuentaExiste) {
    return (
      <Link
        href={`/ingresar?destino=/invitacion/${invitacion.id}`}
        className="rounded-md bg-violet-600 px-4 py-2 text-center font-medium text-white hover:bg-violet-700"
      >
        Ingresa para aceptarla
      </Link>
    );
  }

  return (
    <form onSubmit={alEnviar(registrarYAceptar)} className="flex flex-col gap-4">
      <Campo etiqueta="Correo" id="email" type="email" value={invitacion.email} readOnly />
      <Campo etiqueta="Nombre completo" id="nombre" autoComplete="name" required autoFocus />
      <Campo
        etiqueta="Contraseña"
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
      <Boton cargando={cargando}>Crear cuenta y unirme</Boton>
    </form>
  );
}
