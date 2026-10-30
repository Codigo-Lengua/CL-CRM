"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { variablesDeModo } from "@/components/marca/variables";
import { Aviso, Boton, Campo, Insignia, Selector, Tarjeta } from "@/components/ui";
import { esHex } from "@/modules/marca/dominio/contraste";
import {
  type ColoresMarca,
  FUENTES_TEXTO,
  FUENTES_TITULOS,
  type Marca,
  MARCA_CODIGO_LENGUA,
} from "@/modules/marca/dominio/marca";
import { revisarContraste } from "@/modules/marca/dominio/tokens";
import { guardarMarcaOrganizacion } from "./acciones";

const COLORES: { clave: keyof ColoresMarca; nombre: string; uso: string }[] = [
  { clave: "fondo", nombre: "Fondo", uso: "Fondo en modo oscuro y texto en modo claro" },
  { clave: "lienzo", nombre: "Lienzo", uso: "Fondo en modo claro y texto en modo oscuro" },
  { clave: "primario", nombre: "Primario", uso: "Botones principales y foco" },
  { clave: "acento", nombre: "Acento", uso: "Hover y estados activos" },
  { clave: "brillo", nombre: "Brillo", uso: "Enlaces, bordes y gráficas" },
  { clave: "secundario", nombre: "Secundario", uso: "Superficies y tarjetas" },
];

export function EditorMarca({ inicial }: { inicial: Marca }) {
  const router = useRouter();
  const [marca, setMarca] = useState(inicial);
  const [textos, setTextos] = useState<Record<string, string>>({ ...inicial.colores });
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<{ tono: "ok" | "error"; texto: string } | null>(null);
  const problemas = useMemo(() => revisarContraste(marca), [marca]);

  function cambiarColor(clave: keyof ColoresMarca, valor: string) {
    setTextos((t) => ({ ...t, [clave]: valor }));
    const hex = valor.trim();
    if (esHex(hex)) setMarca((m) => ({ ...m, colores: { ...m.colores, [clave]: hex.toUpperCase() } }));
  }

  function restablecer() {
    setMarca(MARCA_CODIGO_LENGUA);
    setTextos({ ...MARCA_CODIGO_LENGUA.colores });
  }

  function guardar() {
    iniciar(async () => {
      const resultado = await guardarMarcaOrganizacion(marca);
      setAviso(
        resultado.ok ? { tono: "ok", texto: "Marca guardada." } : { tono: "error", texto: resultado.error },
      );
      if (resultado.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex flex-col gap-6">
        <Tarjeta className="flex flex-col gap-4">
          <h2 className="font-semibold">Identidad</h2>
          <Campo
            etiqueta="Nombre comercial"
            value={marca.nombreComercial}
            maxLength={80}
            onChange={(e) => setMarca((m) => ({ ...m, nombreComercial: e.target.value }))}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <Selector
              etiqueta="Fuente del texto"
              value={marca.fuentes.texto}
              onChange={(e) =>
                setMarca((m) => ({
                  ...m,
                  fuentes: { ...m.fuentes, texto: e.target.value as Marca["fuentes"]["texto"] },
                }))
              }
            >
              {FUENTES_TEXTO.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Selector>
            <Selector
              etiqueta="Fuente de títulos"
              ayuda="Solo títulos y cifras destacadas."
              value={marca.fuentes.titulos}
              onChange={(e) =>
                setMarca((m) => ({
                  ...m,
                  fuentes: { ...m.fuentes, titulos: e.target.value as Marca["fuentes"]["titulos"] },
                }))
              }
            >
              {FUENTES_TITULOS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </Selector>
          </div>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="font-semibold">Colores</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {COLORES.map(({ clave, nombre, uso }) => (
              <div key={clave} className="flex items-start gap-2">
                <input
                  type="color"
                  aria-label={`${nombre}, selector`}
                  value={marca.colores[clave].toLowerCase()}
                  onChange={(e) => cambiarColor(clave, e.target.value)}
                  className="mt-6 h-10 w-12 shrink-0 cursor-pointer rounded-md border border-borde-control bg-superficie"
                />
                <Campo
                  etiqueta={nombre}
                  ayuda={uso}
                  value={textos[clave] ?? ""}
                  maxLength={7}
                  spellCheck={false}
                  error={esHex((textos[clave] ?? "").trim()) ? null : "Formato #RRGGBB"}
                  onChange={(e) => cambiarColor(clave, e.target.value)}
                  className="min-w-0 flex-1"
                />
              </div>
            ))}
          </div>
        </Tarjeta>

        <Tarjeta className="flex flex-col gap-4">
          <h2 className="font-semibold">Logos</h2>
          {(
            [
              ["isotipo", "Isotipo (barra lateral, cuadrado)"],
              ["logotipo", "Logotipo (ingreso y documentos)"],
              ["completo", "Logo completo"],
            ] as const
          ).map(([clave, etiqueta]) => (
            <Campo
              key={clave}
              etiqueta={etiqueta}
              ayuda="Ruta pública (/marca/…) o URL https."
              value={marca.logos[clave]}
              onChange={(e) => setMarca((m) => ({ ...m, logos: { ...m.logos, [clave]: e.target.value } }))}
            />
          ))}
        </Tarjeta>
      </div>

      <div className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
        <h2 className="font-semibold">Vista previa</h2>
        {(["oscuro", "claro"] as const).map((modo) => (
          <div
            key={modo}
            style={variablesDeModo(marca, modo)}
            className="flex flex-col gap-3 rounded-lg border border-borde bg-fondo p-4 font-sans text-texto"
          >
            <div className="flex items-center justify-between">
              <span className="font-titulos text-sm font-semibold tracking-wider">
                {marca.nombreComercial}
              </span>
              <Insignia tono="primario">Modo {modo}</Insignia>
            </div>
            <div className="flex flex-col gap-2 rounded-md border border-borde bg-superficie-alta p-3">
              <p className="text-sm">Spa Aurora · Negocio abierto</p>
              <p className="text-xs text-texto-suave">Cotización CL-0042 por $ 2.400.000</p>
              <a className="text-sm text-enlace underline" href="#vista">
                Ver ficha
              </a>
            </div>
            <div className="flex flex-wrap gap-2">
              <Boton tamano="sm">Guardar</Boton>
              <Boton tamano="sm" variante="secundario">
                Cancelar
              </Boton>
              <Insignia tono="exito">Ganado</Insignia>
              <Insignia tono="peligro">Vencido</Insignia>
              <Insignia tono="aviso">En pausa</Insignia>
            </div>
          </div>
        ))}

        {problemas.length > 0 ? (
          <Aviso tono="aviso">
            Esta combinación no se puede guardar porque no cumple el contraste mínimo:{" "}
            {problemas
              .slice(0, 3)
              .map((p) => `${p.nombre} en modo ${p.modo} (${p.contraste}:1, mínimo ${p.minimo}:1)`)
              .join("; ")}
            .
          </Aviso>
        ) : (
          <Aviso tono="ok">Cumple contraste AA en modo oscuro y claro.</Aviso>
        )}
        {aviso ? <Aviso tono={aviso.tono}>{aviso.texto}</Aviso> : null}
        <div className="flex gap-2">
          <Boton onClick={guardar} cargando={pendiente} disabled={problemas.length > 0}>
            Guardar marca
          </Boton>
          <Boton variante="secundario" onClick={restablecer} disabled={pendiente}>
            Volver a CÓDIGO LENGUA
          </Boton>
        </div>
      </div>
    </div>
  );
}
