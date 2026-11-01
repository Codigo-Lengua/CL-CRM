import { ErrorVigencia, planearNuevoPrecio, type PrecioConVigencia } from "../precios";
import { normalizar } from "./columnas";
import type { Lectura, Periodicidad, PrecioLeido, Problema, ServicioLeido, Tipo } from "./lectura";

/** Lo que ya hay en el catálogo de la organización, en la forma que necesita el plan. */
export interface EstadoCatalogo {
  servicios: {
    id: string;
    codigo: string;
    tipo: Tipo;
    precios: PrecioConVigencia[];
    planes: { id: string; nombre: string; precios: PrecioConVigencia[] }[];
    costos: { id: string; concepto: string }[];
    impuestoIds: string[];
  }[];
  lineas: { id: string; codigo: string; etiqueta: string }[];
  impuestos: { id: string; codigo: string }[];
}

export type Linea = { id: string } | { nueva: string } | null;

export interface PrecioPlaneado extends PrecioLeido {
  /** IGUAL: ya existe con el mismo valor y vigencia; no se vuelve a crear. */
  estado: "NUEVO" | "IGUAL";
}

export interface OperacionServicio {
  codigo: string;
  accion: "CREAR" | "ACTUALIZAR";
  servicioId: string | null;
  datos: {
    nombre?: string;
    tipo?: Tipo;
    linea?: Linea;
    incluye?: string;
    entregaDias?: number;
    horas?: number;
    visibleWeb?: boolean;
    requiereCotizacionManual?: boolean;
  };
  planes: { nombre: string; limiteUso?: number; planId: string | null }[];
  precios: PrecioPlaneado[];
  costos: { concepto: string; valor: number; periodicidad: Periodicidad; costoId: string | null }[];
  /** Impuestos que hay que agregar; los que el servicio ya tiene se conservan. */
  impuestoIds: string[];
}

export interface PlanImportacion {
  operaciones: OperacionServicio[];
  errores: Problema[];
  resumen: {
    filas: number;
    crear: number;
    actualizar: number;
    precios: number;
    preciosIguales: number;
    costos: number;
    lineasNuevas: string[];
  };
}

const igual = (a: PrecioConVigencia, b: PrecioLeido) =>
  a.desde === b.desde && a.hasta === b.hasta && Math.abs(a.valor - b.valor) < 0.005;

function buscarLinea(estado: EstadoCatalogo, nombre: string): Linea {
  const clave = normalizar(nombre);
  const linea = estado.lineas.find((l) => normalizar(l.codigo) === clave || normalizar(l.etiqueta) === clave);
  return linea ? { id: linea.id } : { nueva: nombre };
}

/**
 * Simula la importación contra el catálogo actual sin escribir nada: decide qué se crea y qué se
 * actualiza, y encuentra los errores que solo se ven con los datos de la organización (impuestos
 * que no existen, precios que se cruzan con otros, planes en servicios de proyecto).
 * La misma simulación se repite dentro de la transacción, así que lo que se previsualiza es lo que
 * se guarda.
 */
export function planearImportacion(lectura: Lectura, estado: EstadoCatalogo): PlanImportacion {
  const errores: Problema[] = [...lectura.errores];
  const operaciones: OperacionServicio[] = [];
  const lineasNuevas = new Set<string>();

  for (const s of lectura.servicios) {
    const existente = estado.servicios.find((e) => e.codigo === s.codigo);
    const error = (mensaje: string, fila = s.fila) => errores.push({ fila, codigo: s.codigo, mensaje });

    // Si la fila ya traía un error de formato, no se repite como "falta el dato".
    const conErrorDeFormato = lectura.errores.some((e) => e.codigo === s.codigo);
    if (!existente && !conErrorDeFormato) {
      if (!s.nombre) error("Es un servicio nuevo: falta el nombre.");
      if (!s.tipo) error("Es un servicio nuevo: falta el tipo (Proyecto o Mensual).");
    }
    const tipo = s.tipo ?? existente?.tipo;
    const tienePlanes = s.planes.length > 0 || (existente?.planes.length ?? 0) > 0;
    if (existente && s.tipo === "PROYECTO" && existente.planes.length > 0)
      error("Este servicio tiene planes; no puede pasar a ser de proyecto.");
    if (tipo === "PROYECTO" && s.planes.length > 0 && existente && !s.tipo)
      error("Solo los servicios mensuales tienen planes.");
    const sinPlan = s.precios.find((p) => p.plan === null);
    if (sinPlan && tienePlanes && s.planes.length === 0)
      error("Este servicio tiene planes: cada precio debe decir a qué plan pertenece.", sinPlan.fila);

    const linea = s.linea ? buscarLinea(estado, s.linea) : undefined;
    if (linea && "nueva" in linea) lineasNuevas.add(linea.nueva);

    const impuestoIds: string[] = [];
    for (const codigo of s.impuestos) {
      const impuesto = estado.impuestos.find((i) => i.codigo === codigo);
      if (!impuesto) error(`El impuesto ${codigo} no existe. Créalo primero en Catálogo › Impuestos.`);
      else if (!existente?.impuestoIds.includes(impuesto.id)) impuestoIds.push(impuesto.id);
    }

    const planes = s.planes.map((p) => ({
      ...p,
      planId: existente?.planes.find((e) => e.nombre.toLowerCase() === p.nombre.toLowerCase())?.id ?? null,
    }));

    // Precios: se simulan en orden de vigencia sobre los que ya hay, como lo hará la transacción.
    const precios: PrecioPlaneado[] = [];
    const vigentesPorDestino = new Map<string, PrecioConVigencia[]>();
    const destino = (plan: string | null) => {
      const clave = (plan ?? "").toLowerCase();
      if (!vigentesPorDestino.has(clave)) {
        const actuales = plan
          ? (existente?.planes.find((e) => e.nombre.toLowerCase() === clave)?.precios ?? [])
          : (existente?.precios ?? []);
        vigentesPorDestino.set(
          clave,
          actuales.map((p) => ({ ...p })),
        );
      }
      return vigentesPorDestino.get(clave)!;
    };
    for (const p of s.precios) {
      const actuales = destino(p.plan);
      if (actuales.some((a) => igual(a, p))) {
        precios.push({ ...p, estado: "IGUAL" });
        continue;
      }
      try {
        const { cerrar } = planearNuevoPrecio(actuales, { desde: p.desde, hasta: p.hasta });
        if (cerrar) actuales.find((a) => a.id === cerrar.id)!.hasta = cerrar.hasta;
        actuales.push({ id: `fila-${p.fila}`, valor: p.valor, desde: p.desde, hasta: p.hasta });
        precios.push({ ...p, estado: "NUEVO" });
      } catch (e) {
        if (!(e instanceof ErrorVigencia)) throw e;
        error(`${p.plan ? `Plan ${p.plan}: ` : ""}${e.message}`, p.fila);
      }
    }

    operaciones.push({
      codigo: s.codigo,
      accion: existente ? "ACTUALIZAR" : "CREAR",
      servicioId: existente?.id ?? null,
      datos: datosDe(s, linea),
      planes,
      precios,
      costos: s.costos.map((c) => ({
        concepto: c.concepto,
        valor: c.valor,
        periodicidad: c.periodicidad,
        costoId:
          existente?.costos.find((e) => e.concepto.toLowerCase() === c.concepto.toLowerCase())?.id ?? null,
      })),
      impuestoIds,
    });
  }

  errores.sort((a, b) => (a.fila ?? 0) - (b.fila ?? 0));
  return {
    operaciones,
    errores,
    resumen: {
      filas: lectura.filas,
      crear: operaciones.filter((o) => o.accion === "CREAR").length,
      actualizar: operaciones.filter((o) => o.accion === "ACTUALIZAR").length,
      precios: operaciones.reduce((n, o) => n + o.precios.filter((p) => p.estado === "NUEVO").length, 0),
      preciosIguales: operaciones.reduce(
        (n, o) => n + o.precios.filter((p) => p.estado === "IGUAL").length,
        0,
      ),
      costos: operaciones.reduce((n, o) => n + o.costos.length, 0),
      lineasNuevas: [...lineasNuevas],
    },
  };
}

function datosDe(s: ServicioLeido, linea: Linea | undefined): OperacionServicio["datos"] {
  const datos: OperacionServicio["datos"] = {
    nombre: s.nombre,
    tipo: s.tipo,
    linea,
    incluye: s.incluye,
    entregaDias: s.entregaDias,
    horas: s.horas,
    visibleWeb: s.visibleWeb,
    requiereCotizacionManual: s.requiereCotizacionManual,
  };
  return Object.fromEntries(Object.entries(datos).filter(([, v]) => v !== undefined));
}
