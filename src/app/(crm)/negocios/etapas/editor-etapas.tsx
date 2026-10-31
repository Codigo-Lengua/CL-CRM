"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Aviso, Boton, clasesControl, cx, Insignia, Tarjeta, useToast } from "@/components/ui";
import { guardarEtapasAccion } from "../acciones";

type Tipo = "ABIERTA" | "GANADA" | "ENTREGADA" | "PERDIDA";

export interface FilaEtapa {
  id?: string;
  clave: string;
  nombre: string;
  tipoSistema: Tipo;
  limiteAsesor: boolean;
  probabilidad: number;
  activo: boolean;
  negocios: number;
}

const NOMBRE_TIPO: Record<Tipo, string> = {
  ABIERTA: "Abierta",
  GANADA: "Ganada",
  ENTREGADA: "Entregada",
  PERDIDA: "Perdida",
};

/**
 * Editor del embudo: nombre, orden, probabilidad, límite del asesor y etapas abiertas nuevas.
 * El tipo de sistema de las etapas de cierre no se cambia: es lo que entienden las reglas.
 */
export function EditorEtapas({ iniciales }: { iniciales: FilaEtapa[] }) {
  const router = useRouter();
  const toast = useToast();
  const [filas, setFilas] = useState(iniciales);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, iniciar] = useTransition();

  const cambiar = (i: number, cambios: Partial<FilaEtapa>) =>
    setFilas((actual) => actual.map((f, j) => (j === i ? { ...f, ...cambios } : f)));
  const mover = (i: number, delta: number) =>
    setFilas((actual) => {
      const copia = [...actual];
      const [fila] = copia.splice(i, 1);
      copia.splice(i + delta, 0, fila!);
      return copia;
    });
  const marcarLimite = (i: number) =>
    setFilas((actual) => actual.map((f, j) => ({ ...f, limiteAsesor: j === i })));
  const agregar = () =>
    setFilas((actual) => {
      const primeraCerrada = actual.findIndex((f) => f.tipoSistema !== "ABIERTA");
      const nueva: FilaEtapa = {
        clave: `nueva-${Date.now()}`,
        nombre: "",
        tipoSistema: "ABIERTA",
        limiteAsesor: false,
        probabilidad: 50,
        activo: true,
        negocios: 0,
      };
      const copia = [...actual];
      copia.splice(primeraCerrada < 0 ? copia.length : primeraCerrada, 0, nueva);
      return copia;
    });

  function guardar() {
    iniciar(async () => {
      const r = await guardarEtapasAccion(
        filas.map(({ id, nombre, tipoSistema, limiteAsesor, probabilidad, activo }) => ({
          id,
          nombre,
          tipoSistema,
          limiteAsesor,
          probabilidad,
          activo,
        })),
      );
      if (!r.ok) {
        setError(r.error);
        return;
      }
      setError(null);
      toast("ok", "Embudo guardado.");
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? <Aviso tono="error">{error}</Aviso> : null}
      <Tarjeta className="p-0">
        <ol className="divide-y divide-borde">
          {filas.map((f, i) => (
            <li
              key={f.id ?? f.clave}
              className={cx(
                "grid gap-3 p-4 sm:grid-cols-[auto_1fr_auto_auto_auto] sm:items-center",
                !f.activo && "opacity-60",
              )}
            >
              <div className="flex gap-1">
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  aria-label={`Subir ${f.nombre || "etapa"}`}
                  disabled={i === 0}
                  onClick={() => mover(i, -1)}
                >
                  ↑
                </Boton>
                <Boton
                  tamano="sm"
                  variante="fantasma"
                  aria-label={`Bajar ${f.nombre || "etapa"}`}
                  disabled={i === filas.length - 1}
                  onClick={() => mover(i, 1)}
                >
                  ↓
                </Boton>
              </div>
              <div className="flex flex-col gap-1">
                <input
                  aria-label="Nombre de la etapa"
                  value={f.nombre}
                  placeholder="Nombre de la etapa"
                  onChange={(e) => cambiar(i, { nombre: e.target.value })}
                  className={clasesControl}
                />
                <span className="flex flex-wrap gap-1 text-xs text-texto-suave">
                  <Insignia>{NOMBRE_TIPO[f.tipoSistema]}</Insignia>
                  {f.negocios > 0 ? (
                    <span>{f.negocios === 1 ? "1 negocio" : `${f.negocios} negocios`}</span>
                  ) : null}
                </span>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={f.probabilidad}
                  onChange={(e) => cambiar(i, { probabilidad: Number(e.target.value) })}
                  className={cx(clasesControl, "w-20")}
                  aria-label={`Probabilidad de ${f.nombre}`}
                />
                %
              </label>
              <label
                className={cx("flex items-center gap-2 text-sm", f.tipoSistema !== "ABIERTA" && "invisible")}
              >
                <input
                  type="radio"
                  name="limite"
                  checked={f.limiteAsesor}
                  onChange={() => marcarLimite(i)}
                  className="size-4 accent-primario"
                />
                Límite del asesor
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={f.activo}
                  disabled={f.negocios > 0 && f.activo}
                  onChange={(e) => cambiar(i, { activo: e.target.checked })}
                  className="size-4 accent-primario"
                />
                Activa
              </label>
            </li>
          ))}
        </ol>
      </Tarjeta>
      <div className="flex flex-wrap justify-between gap-2">
        <Boton variante="secundario" onClick={agregar}>
          Agregar etapa abierta
        </Boton>
        <div className="flex gap-2">
          <Boton variante="secundario" onClick={() => setFilas(iniciales)} disabled={pendiente}>
            Deshacer cambios
          </Boton>
          <Boton onClick={guardar} cargando={pendiente}>
            Guardar embudo
          </Boton>
        </div>
      </div>
    </div>
  );
}
