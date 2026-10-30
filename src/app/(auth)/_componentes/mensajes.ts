const POR_CODIGO: Record<string, string> = {
  INVALID_EMAIL_OR_PASSWORD: "El correo o la contraseña no coinciden.",
  INVALID_CODE: "El código no es válido. Revisa la hora de tu teléfono o usa un código de respaldo.",
  INVALID_TWO_FACTOR_CODE:
    "El código no es válido. Revisa la hora de tu teléfono o usa un código de respaldo.",
  INVALID_BACKUP_CODE: "El código de respaldo no es válido o ya se usó.",
  PASSWORD_TOO_SHORT: "La contraseña debe tener al menos 10 caracteres.",
  INVALID_TOKEN: "El enlace venció o ya se usó. Pide uno nuevo.",
};

/** Traduce los errores de Better Auth a mensajes para la persona, sin revelar si un correo existe. */
export function mensajeDeError(
  error: { status?: number; code?: string; message?: string } | null | undefined,
) {
  if (!error) return "";
  const porCodigo = error.code ? POR_CODIGO[error.code] : undefined;
  if (porCodigo) return porCodigo;
  if (error.status === 429) return "Demasiados intentos. Espera un minuto y vuelve a intentarlo.";
  if (error.status === 403) return error.message ?? "No tienes permiso para hacer esto.";
  return "No se pudo completar. Intenta de nuevo.";
}
