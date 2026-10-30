import { CLAVES, DEFINICIONES } from "./definiciones";

export type TipoCatalogo =
  | "CATEGORIA_EMPRESA"
  | "FUENTE_LEAD"
  | "MOTIVO_PERDIDA"
  | "RESULTADO_ACTIVIDAD"
  | "LINEA_SERVICIO"
  | "MOTIVO_DEVOLUCION"
  | "TIPO_SOLICITUD_DATOS";

export type Canal = "WHATSAPP" | "CORREO" | "ASESOR";

export interface ValorCatalogoPlantilla {
  codigo: string;
  etiqueta: string;
  /** El código depende de este valor: no se borra ni cambia de código. */
  esSistema?: boolean;
  atributos?: Record<string, unknown>;
}

export interface CanalPlantilla {
  canal: Canal;
  activo: boolean;
  reintentos: number;
  plantilla: string | null;
  visibleEnCotizador: boolean;
}

/**
 * Valores iniciales de una organización nueva (CL-CRM-01 §2). Cada sector puede tener la
 * suya; las claves de CONFIGURACION que no traiga salen de DEFINICIONES.
 */
export interface Plantilla {
  sector: string;
  nombre: string;
  configuracion: Partial<Record<(typeof CLAVES)[number], unknown>>;
  catalogos: Record<TipoCatalogo, ValorCatalogoPlantilla[]>;
  /** En orden de la cascada: el primero tiene prioridad 1. */
  canales: CanalPlantilla[];
}

export const NOMBRE_CATALOGO: Record<TipoCatalogo, string> = {
  CATEGORIA_EMPRESA: "Categorías de empresa",
  FUENTE_LEAD: "Fuentes de lead",
  MOTIVO_PERDIDA: "Motivos de pérdida",
  RESULTADO_ACTIVIDAD: "Resultados de actividad",
  LINEA_SERVICIO: "Líneas de servicio",
  MOTIVO_DEVOLUCION: "Motivos de devolución",
  TIPO_SOLICITUD_DATOS: "Solicitudes de datos personales",
};

export const NOMBRE_CANAL: Record<Canal, string> = {
  WHATSAPP: "WhatsApp",
  CORREO: "Correo",
  ASESOR: "Asesor",
};

const efectivo = { contacto_efectivo: true };
const noEfectivo = { contacto_efectivo: false };

/** Plantilla de CÓDIGO LENGUA, que es también la plantilla general. */
export const PLANTILLA_CODIGO_LENGUA: Plantilla = {
  sector: "servicios-digitales",
  nombre: "CÓDIGO LENGUA",
  configuracion: Object.fromEntries(CLAVES.map((clave) => [clave, DEFINICIONES[clave].porDefecto])),
  catalogos: {
    CATEGORIA_EMPRESA: [
      { codigo: "SPA", etiqueta: "Spa" },
      { codigo: "ESTETICA", etiqueta: "Estética" },
      { codigo: "MASAJES", etiqueta: "Masajes" },
      { codigo: "OTRO", etiqueta: "Otro", esSistema: true },
    ],
    FUENTE_LEAD: [
      { codigo: "SITIO_WEB", etiqueta: "Sitio web" },
      { codigo: "GOOGLE_PLACES", etiqueta: "Buscador de prospectos" },
      { codigo: "WHATSAPP", etiqueta: "WhatsApp" },
      { codigo: "INSTAGRAM", etiqueta: "Instagram" },
      { codigo: "MESSENGER", etiqueta: "Messenger" },
      { codigo: "ANUNCIO", etiqueta: "Anuncio pagado" },
      { codigo: "REFERIDO", etiqueta: "Referido" },
      { codigo: "FERIA", etiqueta: "Feria o evento" },
      { codigo: "MANUAL", etiqueta: "Registro manual", esSistema: true },
    ],
    MOTIVO_PERDIDA: [
      { codigo: "PRECIO", etiqueta: "Precio" },
      { codigo: "NO_RESPONDE", etiqueta: "Dejó de responder" },
      { codigo: "ELIGIO_COMPETENCIA", etiqueta: "Eligió a la competencia" },
      { codigo: "SIN_PRESUPUESTO", etiqueta: "Sin presupuesto" },
      { codigo: "NO_ES_EL_MOMENTO", etiqueta: "No es el momento" },
      { codigo: "DEVOLUCION", etiqueta: "Devolución", esSistema: true },
    ],
    RESULTADO_ACTIVIDAD: [
      { codigo: "NO_CONTESTA", etiqueta: "No contesta", atributos: noEfectivo },
      { codigo: "NUMERO_ERRADO", etiqueta: "Número errado", atributos: noEfectivo },
      { codigo: "NO_INTERESADO", etiqueta: "No interesado", atributos: efectivo },
      { codigo: "INTERESADO", etiqueta: "Interesado", atributos: efectivo },
      { codigo: "VOLVER_A_LLAMAR", etiqueta: "Pidió volver a llamar", atributos: efectivo },
      { codigo: "DEMO_AGENDADA", etiqueta: "Demo agendada", atributos: efectivo },
    ],
    LINEA_SERVICIO: [
      { codigo: "SITIO_WEB", etiqueta: "Sitio web" },
      { codigo: "REDES_SOCIALES", etiqueta: "Redes sociales" },
      { codigo: "PUBLICIDAD", etiqueta: "Publicidad digital" },
      { codigo: "BRANDING", etiqueta: "Marca e identidad" },
      { codigo: "SOFTWARE", etiqueta: "Software a la medida" },
    ],
    MOTIVO_DEVOLUCION: [
      { codigo: "INCUMPLIMIENTO", etiqueta: "Incumplimiento de la entrega" },
      { codigo: "INSATISFACCION", etiqueta: "Cliente insatisfecho" },
      { codigo: "CANCELACION", etiqueta: "Cancelación del cliente" },
      { codigo: "OTRO", etiqueta: "Otro", esSistema: true },
    ],
    TIPO_SOLICITUD_DATOS: [
      { codigo: "CONSULTA", etiqueta: "Consulta", esSistema: true },
      { codigo: "ACTUALIZACION", etiqueta: "Actualización o rectificación", esSistema: true },
      { codigo: "SUPRESION", etiqueta: "Supresión", esSistema: true },
      { codigo: "REVOCATORIA", etiqueta: "Revocatoria de la autorización", esSistema: true },
    ],
  },
  canales: [
    { canal: "WHATSAPP", activo: true, reintentos: 2, plantilla: null, visibleEnCotizador: true },
    {
      canal: "CORREO",
      activo: true,
      reintentos: 2,
      plantilla: "Tu cotización de CÓDIGO LENGUA",
      visibleEnCotizador: true,
    },
    { canal: "ASESOR", activo: true, reintentos: 0, plantilla: null, visibleEnCotizador: false },
  ],
};

/** Plantillas disponibles por sector. La primera es la que recibe una organización sin sector. */
export const PLANTILLAS: readonly Plantilla[] = [PLANTILLA_CODIGO_LENGUA];

export function plantillaDeSector(sector: string | null | undefined): Plantilla {
  return PLANTILLAS.find((p) => p.sector === sector) ?? PLANTILLAS[0]!;
}
