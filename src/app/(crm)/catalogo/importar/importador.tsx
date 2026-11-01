"use client";

import { useRouter } from "next/navigation";
import { type DragEvent, useRef, useState, useTransition } from "react";
import { Aviso, Boton, cx, Insignia, Tabla, Tarjeta, Td, Th, Tr, useToast } from "@/components/ui";
import { formatoMoneda } from "../../negocios/formato";
import { importarArchivoAccion, type Revision, revisarArchivoAccion } from "./acciones";

const ACEPTA = ".xlsx,.csv,.pdf";
const SUFIJO_PERIODICIDAD = { UNICO: " · único", MENSUAL: " / mes", ANUAL: " / año" } as const;
const ENLACE_DESCARGA =
  "inline-flex h-10 items-center gap-2 rounded-md border border-borde-control bg-superficie px-4 text-sm font-medium hover:bg-superficie-alta";

function tamano(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Importador({
  columnas,
  moneda,
  maximoFilas,
}: {
  columnas: { encabezado: string; ayuda: string }[];
  moneda: string;
  maximoFilas: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const entrada = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [revision, setRevision] = useState<Revision | null>(null);
  const [arrastrando, setArrastrando] = useState(false);
  const [revisando, revisar] = useTransition();
  const [importando, importar] = useTransition();

  function elegir(nuevo: File | null) {
    setArchivo(nuevo);
    setRevision(null);
    if (nuevo) {
      const datos = new FormData();
      datos.set("archivo", nuevo);
      revisar(async () => setRevision(await revisarArchivoAccion(datos)));
    }
  }

  function soltar(evento: DragEvent<HTMLLabelElement>) {
    evento.preventDefault();
    setArrastrando(false);
    elegir(evento.dataTransfer.files[0] ?? null);
  }

  function confirmar() {
    if (!archivo) return;
    const datos = new FormData();
    datos.set("archivo", archivo);
    importar(async () => {
      const r = await importarArchivoAccion(datos);
      if (!r.ok) {
        toast("error", r.error);
        return;
      }
      toast("ok", `Catálogo importado: ${r.resumen.crear} nuevos y ${r.resumen.actualizar} actualizados.`);
      router.push("/catalogo");
    });
  }

  const plan = revision?.ok ? revision.plan : null;
  const errores = plan?.errores ?? [];

  return (
    <div className="flex flex-col gap-4">
      <Tarjeta className="flex flex-col gap-3">
        <h2 className="font-semibold">1. Descarga la plantilla</h2>
        <p className="text-sm text-texto-suave">
          Trae un ejemplo con tus líneas de servicio. Repite el código en otra fila para agregar un plan, otro
          precio o un costo de terceros. Si un código ya existe, el servicio se actualiza: los precios
          anteriores no se borran, se cierran el día antes del nuevo.
        </p>
        <div className="flex flex-wrap gap-2">
          <a className={ENLACE_DESCARGA} href="/catalogo/importar/plantilla?formato=xlsx" download>
            Excel <Insignia tono="primario">Recomendado</Insignia>
          </a>
          <a className={ENLACE_DESCARGA} href="/catalogo/importar/plantilla?formato=csv" download>
            CSV
          </a>
          <a className={ENLACE_DESCARGA} href="/plantillas/catalogo-ejemplo.pdf" download>
            PDF de ejemplo
          </a>
        </div>
        <details className="group text-sm">
          <summary className="cursor-pointer font-medium text-enlace">Qué va en cada columna</summary>
          <dl className="mt-3 grid gap-x-4 gap-y-2 sm:grid-cols-[12rem_1fr]">
            {columnas.map((c) => (
              <div key={c.encabezado} className="contents">
                <dt className="font-medium">{c.encabezado}</dt>
                <dd className="text-texto-suave">{c.ayuda}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-texto-suave">
            Máximo {maximoFilas} filas y 5 MB. El PDF debe tener una tabla con los mismos encabezados, como el
            de ejemplo; si viene de otro diseño, conviértelo a Excel.
          </p>
        </details>
      </Tarjeta>

      <Tarjeta className="flex flex-col gap-3">
        <h2 className="font-semibold">2. Sube tu archivo</h2>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setArrastrando(true);
          }}
          onDragLeave={() => setArrastrando(false)}
          onDrop={soltar}
          className={cx(
            "flex cursor-pointer flex-col items-center gap-1 rounded-lg border-2 border-dashed p-8 text-center transition-colors focus-within:border-foco",
            arrastrando
              ? "border-primario bg-superficie-alta"
              : "border-borde-control hover:bg-superficie-alta",
          )}
        >
          <span className="font-medium">
            {archivo ? archivo.name : "Arrastra el archivo aquí o haz clic para elegirlo"}
          </span>
          <span className="text-xs text-texto-suave">
            {archivo ? tamano(archivo.size) : "Excel (.xlsx), CSV (.csv) o PDF (.pdf)"}
          </span>
          <input
            ref={entrada}
            type="file"
            name="archivo"
            accept={ACEPTA}
            className="sr-only"
            onChange={(e) => elegir(e.currentTarget.files?.[0] ?? null)}
          />
        </label>
        {revisando ? (
          <p role="status" className="animate-pulse text-sm text-texto-suave">
            Revisando el archivo…
          </p>
        ) : null}
        {revision && !revision.ok ? <Aviso>{revision.error}</Aviso> : null}
      </Tarjeta>

      {plan ? (
        <Tarjeta className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-semibold">3. Revisa antes de importar</h2>
            <span className="text-xs text-texto-suave">
              {revision?.ok ? `${revision.formato} · ` : ""}
              {plan.resumen.filas} filas leídas
            </span>
          </div>

          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Servicios nuevos", plan.resumen.crear],
              ["Se actualizan", plan.resumen.actualizar],
              ["Precios nuevos", plan.resumen.precios],
              ["Costos", plan.resumen.costos],
            ].map(([titulo, valor]) => (
              <div key={titulo} className="rounded-md border border-borde p-3">
                <dt className="text-xs text-texto-suave">{titulo}</dt>
                <dd className="text-2xl font-semibold tabular-nums">{valor}</dd>
              </div>
            ))}
          </dl>

          {plan.resumen.preciosIguales || plan.resumen.lineasNuevas.length ? (
            <ul className="flex flex-col gap-1 text-sm text-texto-suave">
              {plan.resumen.preciosIguales ? (
                <li>{plan.resumen.preciosIguales} precios ya estaban iguales y se dejan como están.</li>
              ) : null}
              {plan.resumen.lineasNuevas.length ? (
                <li>Se crean las líneas de servicio: {plan.resumen.lineasNuevas.join(", ")}.</li>
              ) : null}
            </ul>
          ) : null}

          {errores.length ? (
            <div className="flex flex-col gap-2">
              <Aviso>
                {errores.length === 1 ? "Encontré 1 error" : `Encontré ${errores.length} errores`}. Corrígelos
                en el archivo y vuelve a subirlo; no se ha guardado nada.
              </Aviso>
              <Tabla>
                <thead>
                  <tr>
                    <Th className="w-16">Fila</Th>
                    <Th className="w-40">Código</Th>
                    <Th>Qué corregir</Th>
                  </tr>
                </thead>
                <tbody>
                  {errores.map((e, i) => (
                    <Tr key={i}>
                      <Td className="tabular-nums">{e.fila ?? "—"}</Td>
                      <Td className="font-mono text-xs">{e.codigo ?? "—"}</Td>
                      <Td>{e.mensaje}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Tabla>
            </div>
          ) : null}

          {plan.operaciones.length ? (
            <Tabla>
              <thead>
                <tr>
                  <Th>Servicio</Th>
                  <Th>Acción</Th>
                  <Th>Precios</Th>
                  <Th>Costos</Th>
                </tr>
              </thead>
              <tbody>
                {plan.operaciones.map((o) => (
                  <Tr key={o.codigo}>
                    <Td>
                      <span className="font-medium">{o.datos.nombre ?? o.codigo}</span>
                      <span className="block text-xs text-texto-suave">
                        {o.codigo}
                        {o.planes.length ? ` · ${o.planes.map((p) => p.nombre).join(", ")}` : ""}
                      </span>
                    </Td>
                    <Td>
                      {o.accion === "CREAR" ? (
                        <Insignia tono="exito">Nuevo</Insignia>
                      ) : (
                        <Insignia tono="primario">Actualiza</Insignia>
                      )}
                    </Td>
                    <Td className="text-sm">
                      {o.precios.length === 0 ? (
                        <span className="text-texto-suave">
                          {o.datos.requiereCotizacionManual ? "A cotizar" : "Sin precio"}
                        </span>
                      ) : (
                        <ul>
                          {o.precios.map((p) => (
                            <li
                              key={p.fila}
                              className={cx("tabular-nums", p.estado === "IGUAL" && "text-texto-suave")}
                            >
                              {p.plan ? `${p.plan}: ` : ""}
                              {formatoMoneda(p.valor, moneda)}
                              <span className="text-xs text-texto-suave"> desde {p.desde}</span>
                              {p.estado === "IGUAL" ? <span className="text-xs"> · sin cambio</span> : null}
                            </li>
                          ))}
                        </ul>
                      )}
                    </Td>
                    <Td className="text-sm">
                      {o.costos.length ? (
                        <ul>
                          {o.costos.map((c) => (
                            <li key={c.concepto} className="tabular-nums">
                              {c.concepto}: {formatoMoneda(c.valor, moneda)}
                              <span className="text-xs text-texto-suave">
                                {SUFIJO_PERIODICIDAD[c.periodicidad]}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-texto-suave">—</span>
                      )}
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Tabla>
          ) : null}

          <div className="flex flex-wrap justify-end gap-2">
            <Boton
              variante="secundario"
              onClick={() => {
                elegir(null);
                if (entrada.current) entrada.current.value = "";
                entrada.current?.click();
              }}
            >
              Elegir otro archivo
            </Boton>
            <Boton
              onClick={confirmar}
              cargando={importando}
              disabled={errores.length > 0 || !plan.operaciones.length}
            >
              Importar {plan.operaciones.length} {plan.operaciones.length === 1 ? "servicio" : "servicios"}
            </Boton>
          </div>
        </Tarjeta>
      ) : null}
    </div>
  );
}
