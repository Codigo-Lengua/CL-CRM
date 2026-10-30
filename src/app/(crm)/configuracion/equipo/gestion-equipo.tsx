"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clasesControl } from "@/components/ui";
import { authCliente } from "@/lib/auth/cliente";
import { NOMBRE_ROL, type Rol } from "@/lib/permisos";

interface Miembro {
  id: string;
  rol: string;
  nombre: string;
  email: string;
  dosPasos: boolean;
}

interface Invitacion {
  id: string;
  email: string;
  rol: string;
  vence: string;
}

const fecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium", timeZone: "America/Bogota" });

const estiloCampo = `${clasesControl} h-auto py-2`;
const estiloEnlace = "text-sm text-enlace hover:underline disabled:opacity-50";

export function GestionEquipo(props: {
  organizacionId: string;
  miembroActualId: string;
  roles: Rol[];
  miembros: Miembro[];
  invitaciones: Invitacion[];
}) {
  const { organizacionId, miembroActualId, roles, miembros, invitaciones } = props;
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tipo: "ok" | "error"; texto: string } | null>(null);

  function ejecutar(accion: () => Promise<{ error: { message?: string } | null }>, exito: string) {
    iniciar(async () => {
      const { error } = await accion();
      setAviso(
        error
          ? { tipo: "error", texto: error.message ?? "No se pudo completar." }
          : { tipo: "ok", texto: exito },
      );
      if (!error) router.refresh();
    });
  }

  function invitar(datos: FormData) {
    const email = String(datos.get("email")).trim().toLowerCase();
    const role = String(datos.get("rol")) as Rol;
    ejecutar(
      () =>
        authCliente.organization.inviteMember({ email, role, organizationId: organizacionId, resend: true }),
      `Invitación creada para ${email}. Si no le llega el correo, copia su enlace en la lista de pendientes.`,
    );
  }

  return (
    <div className="flex flex-col gap-8">
      {aviso ? (
        <p
          role={aviso.tipo === "error" ? "alert" : "status"}
          className={`rounded-md border px-3 py-2 text-sm ${
            aviso.tipo === "error"
              ? "border-peligro bg-peligro-fondo text-peligro"
              : "border-exito bg-exito-fondo text-exito"
          }`}
        >
          {aviso.texto}
        </p>
      ) : null}

      <section aria-labelledby="titulo-invitar" className="flex flex-col gap-3">
        <h2 id="titulo-invitar" className="font-semibold">
          Invitar
        </h2>
        <form action={invitar} className="flex flex-wrap items-end gap-3">
          <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm font-medium">
            Correo
            <input name="email" type="email" required className={estiloCampo} />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Rol
            <select name="rol" defaultValue="ASESOR" className={estiloCampo}>
              {roles.map((r) => (
                <option key={r} value={r}>
                  {NOMBRE_ROL[r]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pendiente}
            className="rounded-md bg-primario px-4 py-2 text-sm font-medium text-sobre-primario hover:bg-primario-hover disabled:opacity-60"
          >
            Enviar invitación
          </button>
        </form>
      </section>

      <section aria-labelledby="titulo-miembros" className="flex flex-col gap-3">
        <h2 id="titulo-miembros" className="font-semibold">
          Miembros ({miembros.length})
        </h2>
        <div className="overflow-x-auto rounded-lg border border-borde">
          <table className="w-full text-left text-sm">
            <thead className="bg-superficie-alta text-texto-suave">
              <tr>
                <th className="px-3 py-2 font-medium">Persona</th>
                <th className="px-3 py-2 font-medium">Rol</th>
                <th className="px-3 py-2 font-medium">Dos pasos</th>
                <th className="px-3 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {miembros.map((m) => {
                const soyYo = m.id === miembroActualId;
                return (
                  <tr key={m.id} className="border-t border-borde">
                    <td className="px-3 py-2">
                      <div className="font-medium">
                        {m.nombre}
                        {soyYo ? " (tú)" : ""}
                      </div>
                      <div className="text-texto-suave">{m.email}</div>
                    </td>
                    <td className="px-3 py-2">
                      <select
                        aria-label={`Rol de ${m.nombre}`}
                        defaultValue={m.rol}
                        disabled={soyYo || pendiente}
                        className={estiloCampo}
                        onChange={(e) =>
                          ejecutar(
                            () =>
                              authCliente.organization.updateMemberRole({
                                memberId: m.id,
                                role: e.target.value as Rol,
                                organizationId: organizacionId,
                              }),
                            `${m.nombre} ahora es ${NOMBRE_ROL[e.target.value as Rol]}.`,
                          )
                        }
                      >
                        {roles.map((r) => (
                          <option key={r} value={r}>
                            {NOMBRE_ROL[r]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-3 py-2">{m.dosPasos ? "Activa" : "Sin activar"}</td>
                    <td className="px-3 py-2 text-right">
                      {soyYo ? null : (
                        <button
                          type="button"
                          disabled={pendiente}
                          className={estiloEnlace}
                          onClick={() => {
                            if (
                              !confirm(
                                `¿Quitar a ${m.nombre} de la organización? Perderá el acceso de inmediato.`,
                              )
                            )
                              return;
                            ejecutar(
                              () =>
                                authCliente.organization.removeMember({
                                  memberIdOrEmail: m.id,
                                  organizationId: organizacionId,
                                }),
                              `${m.nombre} ya no tiene acceso.`,
                            );
                          }}
                        >
                          Quitar
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="titulo-invitaciones" className="flex flex-col gap-3">
        <h2 id="titulo-invitaciones" className="font-semibold">
          Invitaciones pendientes
        </h2>
        {invitaciones.length === 0 ? (
          <p className="text-sm text-texto-suave">No hay invitaciones pendientes.</p>
        ) : (
          <ul className="divide-y divide-borde rounded-lg border border-borde">
            {invitaciones.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium">{i.email}</span> · {NOMBRE_ROL[i.rol as Rol] ?? i.rol} · vence
                  el {fecha.format(new Date(i.vence))}
                </span>
                <span className="flex gap-4">
                  <button
                    type="button"
                    className={estiloEnlace}
                    onClick={() =>
                      void navigator.clipboard
                        .writeText(`${window.location.origin}/invitacion/${i.id}`)
                        .then(() => setAviso({ tipo: "ok", texto: `Enlace de ${i.email} copiado.` }))
                    }
                  >
                    Copiar enlace
                  </button>
                  <button
                    type="button"
                    disabled={pendiente}
                    className={estiloEnlace}
                    onClick={() =>
                      ejecutar(
                        () => authCliente.organization.cancelInvitation({ invitationId: i.id }),
                        `Invitación a ${i.email} cancelada.`,
                      )
                    }
                  >
                    Cancelar
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
