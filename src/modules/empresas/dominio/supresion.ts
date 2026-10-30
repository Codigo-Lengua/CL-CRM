/**
 * RN-47: qué se borra al suprimir los datos personales (CL-CRM-04 §6, ampliado a los
 * textos libres). Se conserva lo necesario para la contabilidad: el nombre comercial, la
 * ciudad y la fecha de la autorización.
 */
export const CAMPOS_PERSONALES_EMPRESA = [
  "telefono",
  "telefonoE164",
  "whatsapp",
  "correo",
  "direccion",
  "instagram",
  "notas",
  "campana",
  "utm",
] as const;

export const CAMPOS_PERSONALES_CONTACTO = [
  "cargo",
  "telefono",
  "telefonoE164",
  "correo",
  "autorizacionTexto",
  "notas",
] as const;

export const NOMBRE_SUPRIMIDO = "Contacto suprimido";

export function datosSuprimidosEmpresa(ahora: Date) {
  return {
    ...Object.fromEntries(CAMPOS_PERSONALES_EMPRESA.map((c) => [c, null])),
    noContactar: true,
    aceptaWhatsapp: false,
    suprimidaEn: ahora,
  } as Record<(typeof CAMPOS_PERSONALES_EMPRESA)[number], null> & {
    noContactar: true;
    aceptaWhatsapp: false;
    suprimidaEn: Date;
  };
}

export function datosSuprimidosContacto(ahora: Date) {
  return {
    ...Object.fromEntries(CAMPOS_PERSONALES_CONTACTO.map((c) => [c, null])),
    nombre: NOMBRE_SUPRIMIDO,
    suprimidoEn: ahora,
  } as Record<(typeof CAMPOS_PERSONALES_CONTACTO)[number], null> & { nombre: string; suprimidoEn: Date };
}

/** Enmascara un dato personal para la auditoría: "+573001234567" → "+57•••••••567". */
export function enmascarar(valor: string | null | undefined): string | null {
  if (!valor) return null;
  if (valor.includes("@")) {
    const [usuario, dominio] = valor.split("@");
    return `${usuario!.slice(0, 1)}•••@${dominio}`;
  }
  return valor.length <= 5 ? "•••" : `${valor.slice(0, 3)}${"•".repeat(valor.length - 6)}${valor.slice(-3)}`;
}
