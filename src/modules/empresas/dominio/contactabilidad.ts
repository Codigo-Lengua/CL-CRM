export type CanalContacto = "LLAMADA" | "WHATSAPP" | "CORREO" | "ENVIO";

export interface EstadoContacto {
  noContactar: boolean;
  aceptaWhatsapp: boolean;
  origenDato: "FORMULARIO" | "FUENTE_PUBLICA" | "REFERIDO" | "VISITA" | "IMPORTACION";
  suprimidaEn: Date | null;
}

export type Decision = { permitido: true } | { permitido: false; motivo: string };

/**
 * RN-08: "no contactar" rechaza llamadas, mensajes y envíos.
 * RN-09: a una fuente pública que no ha aceptado WhatsApp no se le escribe por WhatsApp.
 * Una empresa con datos suprimidos (RN-47) tampoco se contacta.
 */
export function puedeContactar(empresa: EstadoContacto, canal: CanalContacto): Decision {
  if (empresa.suprimidaEn) {
    return { permitido: false, motivo: "Sus datos personales fueron suprimidos." };
  }
  if (empresa.noContactar) {
    return { permitido: false, motivo: "Pidió no ser contactada." };
  }
  if (canal === "WHATSAPP" && empresa.origenDato === "FUENTE_PUBLICA" && !empresa.aceptaWhatsapp) {
    return {
      permitido: false,
      motivo: "Viene de una fuente pública y no ha aceptado mensajes por WhatsApp.",
    };
  }
  return { permitido: true };
}
