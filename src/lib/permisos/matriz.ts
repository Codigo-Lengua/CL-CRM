import { type Rol } from "./roles";

/**
 * Permisos finos del CRM (CL-CRM-02 §11). El alcance dice sobre qué registros aplica:
 * - todos: toda la organización.
 * - asignados: solo empresas y negocios asignados al usuario.
 * - propios: solo lo que pertenece al usuario (sus comisiones, su disponibilidad).
 * - pendiente: puede pedirlo, pero queda a la espera de aprobación.
 */
export type Alcance = "todos" | "asignados" | "propios" | "pendiente";

export const PERMISOS = [
  "empresas.ver_editar",
  "actividades.registrar",
  "negocios.mover",
  "cotizaciones.crear",
  "descuentos.solicitar",
  "descuentos.aprobar",
  "costos.ver",
  "leads.reasignar",
  "disponibilidad.cambiar",
  "comisiones.ver",
  "pagos.registrar",
  "devoluciones.aprobar",
  "configuracion.administrar",
  "datos.exportar",
  "integraciones.administrar",
] as const;
export type Permiso = (typeof PERMISOS)[number];

type Matriz = Record<Permiso, Record<Rol, Alcance | null>>;

// null = sin permiso. "negocios.mover" del asesor se restringe además por etapa (§10),
// regla que vive en el módulo de embudo; aquí solo se dice que puede sobre los suyos.
const MATRIZ: Matriz = {
  "empresas.ver_editar": { ADMIN: "todos", SOCIO: "todos", ASESOR: "asignados" },
  "actividades.registrar": { ADMIN: "todos", SOCIO: "todos", ASESOR: "asignados" },
  "negocios.mover": { ADMIN: "todos", SOCIO: "todos", ASESOR: "asignados" },
  "cotizaciones.crear": { ADMIN: "todos", SOCIO: "todos", ASESOR: "asignados" },
  "descuentos.solicitar": { ADMIN: "todos", SOCIO: "todos", ASESOR: "pendiente" },
  "descuentos.aprobar": { ADMIN: "todos", SOCIO: "todos", ASESOR: null },
  "costos.ver": { ADMIN: "todos", SOCIO: "todos", ASESOR: null },
  "leads.reasignar": { ADMIN: "todos", SOCIO: "todos", ASESOR: null },
  "disponibilidad.cambiar": { ADMIN: "propios", SOCIO: "propios", ASESOR: "propios" },
  "comisiones.ver": { ADMIN: "todos", SOCIO: "todos", ASESOR: "propios" },
  "pagos.registrar": { ADMIN: "todos", SOCIO: "todos", ASESOR: null },
  "devoluciones.aprobar": { ADMIN: "todos", SOCIO: null, ASESOR: null },
  "configuracion.administrar": { ADMIN: "todos", SOCIO: null, ASESOR: null },
  "datos.exportar": { ADMIN: "todos", SOCIO: null, ASESOR: null },
  "integraciones.administrar": { ADMIN: "todos", SOCIO: null, ASESOR: null },
};

/** Alcance con que el rol tiene el permiso, o null si no lo tiene. */
export function alcance(rol: Rol, permiso: Permiso): Alcance | null {
  return MATRIZ[permiso][rol];
}

export function puede(rol: Rol, permiso: Permiso): boolean {
  return alcance(rol, permiso) !== null;
}

export class ErrorSinPermiso extends Error {
  constructor(
    readonly rol: Rol,
    readonly permiso: Permiso,
  ) {
    super(`El rol ${rol} no tiene el permiso ${permiso}.`);
    this.name = "ErrorSinPermiso";
  }
}

/** Lanza ErrorSinPermiso si el rol no tiene el permiso; si lo tiene, devuelve su alcance. */
export function exigir(rol: Rol, permiso: Permiso): Alcance {
  const a = alcance(rol, permiso);
  if (a === null) throw new ErrorSinPermiso(rol, permiso);
  return a;
}
