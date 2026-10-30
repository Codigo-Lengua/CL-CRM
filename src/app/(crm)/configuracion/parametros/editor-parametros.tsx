"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { clasesBoton, clasesControl, Pestanas } from "@/components/ui";
import { NOMBRE_ROL, esRol } from "@/lib/permisos";
import {
  type GrupoParametro,
  type Horario,
  NOMBRE_GRUPO,
  type TipoParametro,
} from "@/modules/parametros/dominio/definiciones";
import {
  type Canal,
  NOMBRE_CANAL,
  NOMBRE_CATALOGO,
  type TipoCatalogo,
} from "@/modules/parametros/dominio/plantilla";
import {
  actualizarValorCatalogo,
  agregarFestivo,
  agregarValorCatalogo,
  guardarCanales,
  guardarParametro,
  moverValorCatalogo,
  quitarFestivo,
  type Resultado,
} from "./acciones";

interface Parametro {
  clave: string;
  nombre: string;
  grupo: GrupoParametro;
  tipo: TipoParametro;
  descripcion: string;
  editable: boolean;
  valor: unknown;
}

interface ValorCatalogo {
  id: string;
  tipo: TipoCatalogo;
  codigo: string;
  etiqueta: string;
  activo: boolean;
  esSistema: boolean;
}

interface CanalEnvio {
  canal: Canal;
  activo: boolean;
  reintentos: number;
  plantilla: string | null;
  visibleEnCotizador: boolean;
}

interface Festivo {
  id: string;
  fecha: string;
  nombre: string;
}

interface Miembro {
  usuarioId: string;
  nombre: string;
  rol: string;
}

type Pestana = "generales" | "diccionarios" | "canales" | "festivos";

const PESTANAS: { id: Pestana; nombre: string }[] = [
  { id: "generales", nombre: "Generales" },
  { id: "diccionarios", nombre: "Diccionarios" },
  { id: "canales", nombre: "Canales de envío" },
  { id: "festivos", nombre: "Festivos" },
];

const DIAS: { dia: "1" | "2" | "3" | "4" | "5" | "6" | "7"; nombre: string }[] = [
  { dia: "1", nombre: "Lunes" },
  { dia: "2", nombre: "Martes" },
  { dia: "3", nombre: "Miércoles" },
  { dia: "4", nombre: "Jueves" },
  { dia: "5", nombre: "Viernes" },
  { dia: "6", nombre: "Sábado" },
  { dia: "7", nombre: "Domingo" },
];

const UNIDAD: Record<string, string> = {
  minutos_sla_primer_contacto: "minutos hábiles",
  minutos_corte_cierre: "minutos",
  minutos_reintento_contacto: "minutos",
  minutos_alerta_pausa: "minutos",
  niveles_escalamiento: "niveles",
  capacidad_negocios_asesor: "negocios",
  dias_proteccion_cartera: "días",
  vigencia_cotizacion_dias: "días",
  dia_liquidacion: "de cada mes",
  devolucion_plazo_dias: "días",
  devolucion_plazo_pago_dias: "días",
  devolucion_meses_arrastre: "meses",
  api_limite_por_minuto: "por minuto",
  webhook_fallos_pausa: "fallos",
};

const fechaLarga = new Intl.DateTimeFormat("es-CO", { dateStyle: "full", timeZone: "UTC" });

const estiloCampo = `${clasesControl} h-auto py-2`;
const estiloBoton = clasesBoton({ tamano: "sm" });
const estiloEnlace = "text-sm text-enlace hover:underline disabled:opacity-40";
const estiloTarjeta = "rounded-lg border border-borde bg-superficie p-4";

type Aviso = { tipo: "ok" | "error"; texto: string } | null;

/** Ejecuta una acción del servidor, muestra el resultado y refresca los datos de la página. */
function useAccion() {
  const router = useRouter();
  const [pendiente, iniciar] = useTransition();
  const [aviso, setAviso] = useState<Aviso>(null);

  function ejecutar(accion: () => Promise<Resultado>, exito: string, alTerminar?: () => void) {
    iniciar(async () => {
      const resultado = await accion();
      setAviso(resultado.ok ? { tipo: "ok", texto: exito } : { tipo: "error", texto: resultado.error });
      if (resultado.ok) {
        alTerminar?.();
        router.refresh();
      }
    });
  }

  return { pendiente, aviso, ejecutar };
}

function MensajeAviso({ aviso }: { aviso: Aviso }) {
  if (!aviso) return null;
  return (
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
  );
}

export function EditorParametros(props: {
  parametros: Parametro[];
  catalogos: ValorCatalogo[];
  canales: CanalEnvio[];
  festivos: Festivo[];
  festivosNacionales: string[];
  miembros: Miembro[];
}) {
  const [pestana, setPestana] = useState<Pestana>("generales");

  return (
    <Pestanas opciones={PESTANAS} activa={pestana} onCambiar={setPestana}>
      {pestana === "generales" ? <Generales parametros={props.parametros} miembros={props.miembros} /> : null}
      {pestana === "diccionarios" ? <Diccionarios valores={props.catalogos} /> : null}
      {pestana === "canales" ? <Canales canales={props.canales} /> : null}
      {pestana === "festivos" ? (
        <Festivos propios={props.festivos} nacionales={props.festivosNacionales} />
      ) : null}
    </Pestanas>
  );
}

// ——— Generales ———

function Generales({ parametros, miembros }: { parametros: Parametro[]; miembros: Miembro[] }) {
  const grupos = Object.keys(NOMBRE_GRUPO) as GrupoParametro[];
  return (
    <div className="flex flex-col gap-8">
      {grupos.map((grupo) => (
        <section key={grupo} aria-labelledby={`grupo-${grupo}`} className="flex flex-col gap-3">
          <h2 id={`grupo-${grupo}`} className="font-semibold">
            {NOMBRE_GRUPO[grupo]}
          </h2>
          {parametros
            .filter((p) => p.grupo === grupo)
            .map((p) => (
              <FilaParametro key={p.clave} parametro={p} miembros={miembros} />
            ))}
        </section>
      ))}
    </div>
  );
}

function FilaParametro({ parametro, miembros }: { parametro: Parametro; miembros: Miembro[] }) {
  const { pendiente, aviso, ejecutar } = useAccion();
  const id = `parametro-${parametro.clave}`;

  function guardar(valor: unknown) {
    ejecutar(() => guardarParametro(parametro.clave, valor), `${parametro.nombre}: guardado.`);
  }

  return (
    <div className={`${estiloTarjeta} flex flex-col gap-2`}>
      <div className="flex flex-col gap-0.5">
        <label htmlFor={id} className="text-sm font-medium">
          {parametro.nombre}
          {parametro.editable ? null : (
            <span className="ml-2 rounded bg-superficie-alta px-1.5 py-0.5 text-xs font-normal text-texto-suave">
              Lo define la plataforma
            </span>
          )}
        </label>
        <p className="text-xs text-texto-suave">{parametro.descripcion}</p>
      </div>
      {parametro.tipo === "HORARIO" ? (
        <EditorHorario
          id={id}
          valor={parametro.valor as Horario}
          deshabilitado={!parametro.editable || pendiente}
          onGuardar={guardar}
        />
      ) : (
        <EditorSimple
          id={id}
          parametro={parametro}
          miembros={miembros}
          deshabilitado={!parametro.editable || pendiente}
          onGuardar={guardar}
        />
      )}
      <MensajeAviso aviso={aviso} />
    </div>
  );
}

function EditorSimple(props: {
  id: string;
  parametro: Parametro;
  miembros: Miembro[];
  deshabilitado: boolean;
  onGuardar: (valor: unknown) => void;
}) {
  const { id, parametro, miembros, deshabilitado, onGuardar } = props;

  function alEnviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const crudo = new FormData(evento.currentTarget).get("valor");
    const texto = typeof crudo === "string" ? crudo.trim() : "";
    switch (parametro.tipo) {
      case "NUMERO":
        return onGuardar(texto === "" ? null : Number(texto));
      case "BOOLEANO":
        return onGuardar(texto === "si");
      case "JSON":
        // Lista de números separados por coma: "2, 5, 10".
        return onGuardar(
          texto
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean)
            .map(Number),
        );
      case "TEXTO":
        return onGuardar(texto === "" ? null : texto);
      case "HORARIO":
        return;
    }
  }

  return (
    <form onSubmit={alEnviar} className="flex flex-wrap items-center gap-2">
      {parametro.clave === "usuario_respaldo_id" ? (
        <select
          id={id}
          name="valor"
          defaultValue={(parametro.valor as string | null) ?? ""}
          disabled={deshabilitado}
          className={estiloCampo}
        >
          <option value="">Sin persona de respaldo</option>
          {miembros.map((m) => (
            <option key={m.usuarioId} value={m.usuarioId}>
              {m.nombre} ({esRol(m.rol) ? NOMBRE_ROL[m.rol] : m.rol})
            </option>
          ))}
        </select>
      ) : parametro.tipo === "BOOLEANO" ? (
        <select
          id={id}
          name="valor"
          defaultValue={parametro.valor ? "si" : "no"}
          disabled={deshabilitado}
          className={estiloCampo}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      ) : parametro.tipo === "JSON" ? (
        <input
          id={id}
          name="valor"
          defaultValue={(parametro.valor as number[]).join(", ")}
          disabled={deshabilitado}
          inputMode="numeric"
          aria-describedby={`${id}-ayuda`}
          className={`${estiloCampo} w-40`}
        />
      ) : (
        <input
          id={id}
          name="valor"
          type="number"
          step={1}
          defaultValue={String(parametro.valor ?? "")}
          disabled={deshabilitado}
          required
          className={`${estiloCampo} w-28`}
        />
      )}
      {UNIDAD[parametro.clave] ? (
        <span className="text-sm text-texto-suave">{UNIDAD[parametro.clave]}</span>
      ) : null}
      {parametro.tipo === "JSON" ? (
        <span id={`${id}-ayuda`} className="text-xs text-texto-suave">
          Días separados por coma
        </span>
      ) : null}
      {deshabilitado && !parametro.editable ? null : (
        <button type="submit" disabled={deshabilitado} className={`${estiloBoton} ml-auto`}>
          Guardar
        </button>
      )}
    </form>
  );
}

function EditorHorario(props: {
  id: string;
  valor: Horario;
  deshabilitado: boolean;
  onGuardar: (valor: Horario) => void;
}) {
  const [horario, setHorario] = useState<Record<string, { inicio: string; fin: string }[]>>(
    () => props.valor as Record<string, { inicio: string; fin: string }[]>,
  );

  function cambiar(dia: string, franjas: { inicio: string; fin: string }[]) {
    setHorario((actual) => {
      const nuevo = { ...actual };
      if (franjas.length === 0) delete nuevo[dia];
      else nuevo[dia] = franjas;
      return nuevo;
    });
  }

  return (
    <div className="flex flex-col gap-2" id={props.id}>
      {DIAS.map(({ dia, nombre }) => {
        const franjas = horario[dia] ?? [];
        return (
          <fieldset key={dia} className="flex flex-wrap items-center gap-2 text-sm">
            <legend className="sr-only">{nombre}</legend>
            <label className="flex w-32 items-center gap-2">
              <input
                type="checkbox"
                checked={franjas.length > 0}
                disabled={props.deshabilitado}
                onChange={(e) => cambiar(dia, e.target.checked ? [{ inicio: "08:00", fin: "17:00" }] : [])}
              />
              {nombre}
            </label>
            {franjas.length === 0 ? <span className="text-texto-suave">Cerrado</span> : null}
            {franjas.map((franja, i) => (
              <span key={i} className="flex items-center gap-1">
                <input
                  type="time"
                  aria-label={`${nombre}, apertura ${i + 1}`}
                  value={franja.inicio}
                  disabled={props.deshabilitado}
                  onChange={(e) => cambiar(dia, franjas.with(i, { ...franja, inicio: e.target.value }))}
                  className={estiloCampo}
                />
                <span aria-hidden>a</span>
                <input
                  type="time"
                  aria-label={`${nombre}, cierre ${i + 1}`}
                  value={franja.fin}
                  disabled={props.deshabilitado}
                  onChange={(e) => cambiar(dia, franjas.with(i, { ...franja, fin: e.target.value }))}
                  className={estiloCampo}
                />
                {franjas.length > 1 ? (
                  <button
                    type="button"
                    className={estiloEnlace}
                    disabled={props.deshabilitado}
                    onClick={() =>
                      cambiar(
                        dia,
                        franjas.filter((_, j) => j !== i),
                      )
                    }
                  >
                    Quitar
                  </button>
                ) : null}
              </span>
            ))}
            {franjas.length > 0 ? (
              <button
                type="button"
                className={estiloEnlace}
                disabled={props.deshabilitado}
                onClick={() => cambiar(dia, [...franjas, { inicio: "14:00", fin: "18:00" }])}
              >
                Agregar franja
              </button>
            ) : null}
          </fieldset>
        );
      })}
      <button
        type="button"
        disabled={props.deshabilitado}
        onClick={() => props.onGuardar(horario as Horario)}
        className={`${estiloBoton} self-end`}
      >
        Guardar horario
      </button>
    </div>
  );
}

// ——— Diccionarios ———

function Diccionarios({ valores }: { valores: ValorCatalogo[] }) {
  const tipos = Object.keys(NOMBRE_CATALOGO) as TipoCatalogo[];
  const [tipo, setTipo] = useState<TipoCatalogo>(tipos[0]!);
  const { pendiente, aviso, ejecutar } = useAccion();
  const lista = valores.filter((v) => v.tipo === tipo);

  function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const etiqueta = String(new FormData(formulario).get("etiqueta") ?? "");
    ejecutar(
      () => agregarValorCatalogo({ tipo, etiqueta }),
      `"${etiqueta.trim()}" agregado.`,
      () => formulario.reset(),
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium sm:w-80">
        Lista
        <select
          value={tipo}
          onChange={(e) => setTipo(e.target.value as TipoCatalogo)}
          className={estiloCampo}
        >
          {tipos.map((t) => (
            <option key={t} value={t}>
              {NOMBRE_CATALOGO[t]}
            </option>
          ))}
        </select>
      </label>

      <MensajeAviso aviso={aviso} />

      <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
        {lista.map((valor, i) => (
          <FilaValor
            key={valor.id}
            valor={valor}
            primero={i === 0}
            ultimo={i === lista.length - 1}
            pendiente={pendiente}
            ejecutar={ejecutar}
          />
        ))}
        {lista.length === 0 ? <li className="p-3 text-sm text-texto-suave">Esta lista está vacía.</li> : null}
      </ul>

      <form onSubmit={agregar} className="flex flex-wrap items-end gap-2">
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Nuevo valor en {NOMBRE_CATALOGO[tipo].toLowerCase()}
          <input name="etiqueta" required maxLength={80} className={estiloCampo} />
        </label>
        <button type="submit" disabled={pendiente} className={estiloBoton}>
          Agregar
        </button>
      </form>
      <p className="text-xs text-texto-suave">
        Los valores no se borran porque los registros guardados los siguen usando: desactívalos para que no se
        ofrezcan. Los marcados como del sistema no se pueden desactivar.
      </p>
    </div>
  );
}

function FilaValor(props: {
  valor: ValorCatalogo;
  primero: boolean;
  ultimo: boolean;
  pendiente: boolean;
  ejecutar: ReturnType<typeof useAccion>["ejecutar"];
}) {
  const { valor, primero, ultimo, pendiente, ejecutar } = props;
  const [editando, setEditando] = useState(false);

  function guardar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const etiqueta = String(new FormData(evento.currentTarget).get("etiqueta") ?? "");
    ejecutar(
      () => actualizarValorCatalogo({ id: valor.id, etiqueta, activo: valor.activo }),
      "Nombre actualizado.",
      () => setEditando(false),
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-3 p-3 text-sm">
      <div className="flex flex-col">
        <button
          type="button"
          aria-label={`Subir ${valor.etiqueta}`}
          disabled={primero || pendiente}
          onClick={() => ejecutar(() => moverValorCatalogo(valor.id, "subir"), "Orden actualizado.")}
          className={estiloEnlace}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label={`Bajar ${valor.etiqueta}`}
          disabled={ultimo || pendiente}
          onClick={() => ejecutar(() => moverValorCatalogo(valor.id, "bajar"), "Orden actualizado.")}
          className={estiloEnlace}
        >
          ▼
        </button>
      </div>
      {editando ? (
        <form onSubmit={guardar} className="flex flex-1 items-center gap-2">
          <input
            name="etiqueta"
            aria-label="Nombre"
            defaultValue={valor.etiqueta}
            required
            maxLength={80}
            autoFocus
            className={`${estiloCampo} flex-1`}
          />
          <button type="submit" disabled={pendiente} className={estiloBoton}>
            Guardar
          </button>
          <button type="button" className={estiloEnlace} onClick={() => setEditando(false)}>
            Cancelar
          </button>
        </form>
      ) : (
        <div className="flex flex-1 flex-col">
          <span className={valor.activo ? "" : "text-texto-suave line-through"}>{valor.etiqueta}</span>
          <span className="font-mono text-xs text-texto-suave">
            {valor.codigo}
            {valor.esSistema ? " · del sistema" : ""}
          </span>
        </div>
      )}
      {editando ? null : (
        <div className="flex items-center gap-3">
          <button type="button" className={estiloEnlace} onClick={() => setEditando(true)}>
            Renombrar
          </button>
          {valor.esSistema ? null : (
            <button
              type="button"
              className={estiloEnlace}
              disabled={pendiente}
              onClick={() =>
                ejecutar(
                  () =>
                    actualizarValorCatalogo({
                      id: valor.id,
                      etiqueta: valor.etiqueta,
                      activo: !valor.activo,
                    }),
                  valor.activo ? `"${valor.etiqueta}" desactivado.` : `"${valor.etiqueta}" activado.`,
                )
              }
            >
              {valor.activo ? "Desactivar" : "Activar"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

// ——— Canales de envío ———

function Canales({ canales: iniciales }: { canales: CanalEnvio[] }) {
  const [canales, setCanales] = useState(iniciales);
  const { pendiente, aviso, ejecutar } = useAccion();

  function cambiar(i: number, cambio: Partial<CanalEnvio>) {
    setCanales((actual) => actual.with(i, { ...actual[i]!, ...cambio }));
  }

  function mover(i: number, destino: number) {
    setCanales((actual) => {
      const copia = [...actual];
      const [canal] = copia.splice(i, 1);
      copia.splice(destino, 0, canal!);
      return copia;
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-texto-suave">
        La cotización se envía por el primer canal encendido; si falla tras sus reintentos, pasa al siguiente.
      </p>
      <ol className="flex flex-col gap-3">
        {canales.map((c, i) => (
          <li key={c.canal} className={`${estiloTarjeta} flex flex-col gap-3 text-sm`}>
            <div className="flex items-center gap-3">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-superficie-alta text-xs font-semibold text-enlace">
                {i + 1}
              </span>
              <span className="flex-1 font-medium">{NOMBRE_CANAL[c.canal]}</span>
              <button
                type="button"
                aria-label={`Subir ${NOMBRE_CANAL[c.canal]}`}
                disabled={i === 0 || pendiente}
                onClick={() => mover(i, i - 1)}
                className={estiloEnlace}
              >
                ▲
              </button>
              <button
                type="button"
                aria-label={`Bajar ${NOMBRE_CANAL[c.canal]}`}
                disabled={i === canales.length - 1 || pendiente}
                onClick={() => mover(i, i + 1)}
                className={estiloEnlace}
              >
                ▼
              </button>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.activo}
                  onChange={(e) => cambiar(i, { activo: e.target.checked })}
                />
                Encendido
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={c.visibleEnCotizador}
                  onChange={(e) => cambiar(i, { visibleEnCotizador: e.target.checked })}
                />
                Se ofrece en el cotizador del sitio
              </label>
              <label className="flex items-center gap-2">
                Reintentos
                <input
                  type="number"
                  min={0}
                  max={10}
                  value={c.reintentos}
                  onChange={(e) => cambiar(i, { reintentos: Number(e.target.value) })}
                  className={`${estiloCampo} w-20`}
                />
              </label>
            </div>
            {c.canal === "ASESOR" ? null : (
              <label className="flex flex-col gap-1">
                {c.canal === "WHATSAPP" ? "Plantilla aprobada por Meta" : "Asunto del correo"}
                <input
                  value={c.plantilla ?? ""}
                  maxLength={200}
                  onChange={(e) => cambiar(i, { plantilla: e.target.value })}
                  className={estiloCampo}
                />
              </label>
            )}
          </li>
        ))}
      </ol>
      <MensajeAviso aviso={aviso} />
      <button
        type="button"
        disabled={pendiente}
        onClick={() => ejecutar(() => guardarCanales(canales), "Canales de envío guardados.")}
        className={`${estiloBoton} self-end`}
      >
        Guardar canales
      </button>
    </div>
  );
}

// ——— Festivos ———

function Festivos({ propios, nacionales }: { propios: Festivo[]; nacionales: string[] }) {
  const { pendiente, aviso, ejecutar } = useAccion();

  function agregar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const datos = new FormData(formulario);
    ejecutar(
      () => agregarFestivo({ fecha: datos.get("fecha"), nombre: datos.get("nombre") }),
      "Festivo agregado.",
      () => formulario.reset(),
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="titulo-propios" className="flex flex-col gap-3">
        <h2 id="titulo-propios" className="font-semibold">
          Días no hábiles de tu organización
        </h2>
        <p className="text-sm text-texto-suave">
          Por ejemplo, el aniversario de la empresa o una jornada de inventario. No cuentan para los tiempos
          de respuesta.
        </p>
        <MensajeAviso aviso={aviso} />
        <ul className="flex flex-col divide-y divide-borde rounded-lg border border-borde">
          {propios.map((f) => (
            <li key={f.id} className="flex items-center gap-3 p-3 text-sm">
              <span className="flex-1">
                {f.nombre}
                <span className="block text-xs text-texto-suave">{fechaLarga.format(new Date(f.fecha))}</span>
              </span>
              <button
                type="button"
                className={estiloEnlace}
                disabled={pendiente}
                onClick={() => ejecutar(() => quitarFestivo(f.id), `"${f.nombre}" quitado.`)}
              >
                Quitar
              </button>
            </li>
          ))}
          {propios.length === 0 ? (
            <li className="p-3 text-sm text-texto-suave">Aún no hay días propios.</li>
          ) : null}
        </ul>
        <form onSubmit={agregar} className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Fecha
            <input type="date" name="fecha" required className={estiloCampo} />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Nombre
            <input name="nombre" required maxLength={80} className={estiloCampo} />
          </label>
          <button type="submit" disabled={pendiente} className={estiloBoton}>
            Agregar
          </button>
        </form>
      </section>

      {nacionales.length > 0 ? (
        <section aria-labelledby="titulo-nacionales" className="flex flex-col gap-3">
          <h2 id="titulo-nacionales" className="font-semibold">
            Festivos de Colombia
          </h2>
          <p className="text-sm text-texto-suave">
            Se calculan solos cada año con la Ley Emiliani; no hay que cargarlos.
          </p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {nacionales.map((fecha) => (
              <li key={fecha} className="text-texto">
                {fechaLarga.format(new Date(fecha))}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
