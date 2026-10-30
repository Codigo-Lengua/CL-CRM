/** Configuración de autenticación tomada del entorno. Nada de marca queda fijo en el código. */
export interface ConfigAuth {
  urlBase: string;
  secreto: string;
  /** Nombre que ven los usuarios en su app de autenticación (TOTP) y en los correos. */
  nombreProducto: string;
  produccion: boolean;
  /** Límite de intentos en inicio de sesión, dos pasos y recuperación. Solo se apaga en pruebas. */
  limitarIntentos: boolean;
}

export function leerConfigAuth(env: NodeJS.ProcessEnv = process.env): ConfigAuth {
  const produccion = env.NODE_ENV === "production";
  const secreto = env.BETTER_AUTH_SECRET ?? "";
  if (produccion && secreto.length < 32) {
    throw new Error("BETTER_AUTH_SECRET debe tener al menos 32 caracteres en producción.");
  }
  return {
    urlBase: env.BETTER_AUTH_URL ?? "http://localhost:3000",
    secreto: secreto || "solo-para-desarrollo-no-usar-en-produccion-000",
    nombreProducto: env.NOMBRE_PRODUCTO ?? "CL-CRM",
    produccion,
    limitarIntentos: env.NODE_ENV !== "test",
  };
}
