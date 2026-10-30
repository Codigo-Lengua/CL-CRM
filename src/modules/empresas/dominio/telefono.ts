import { type CountryCode, parsePhoneNumberFromString } from "libphonenumber-js/min";

/**
 * Teléfono en formato internacional E.164 (+573001234567), o null si no es un número
 * válido. El país de la organización se usa cuando el número llega sin indicativo.
 */
export function normalizarTelefono(texto: string | null | undefined, pais = "CO"): string | null {
  const limpio = texto?.trim();
  if (!limpio) return null;
  const numero = parsePhoneNumberFromString(limpio, pais as CountryCode);
  return numero?.isValid() ? numero.number : null;
}
