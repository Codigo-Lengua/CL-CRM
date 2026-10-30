import { createHmac } from "node:crypto";

const ALFABETO = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32(secreto: string): Buffer {
  const bits = [...secreto.replace(/=+$/, "").toUpperCase()]
    .map((c) => ALFABETO.indexOf(c).toString(2).padStart(5, "0"))
    .join("");
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return Buffer.from(bytes);
}

/** Código TOTP de 6 dígitos (RFC 6238), como el que muestra la app de autenticación. */
export function codigoTotp(secreto: string, ahora = Date.now()): string {
  const contador = Buffer.alloc(8);
  contador.writeBigUInt64BE(BigInt(Math.floor(ahora / 30_000)));
  const hmac = createHmac("sha1", base32(secreto)).update(contador).digest();
  const desfase = hmac[hmac.length - 1]! & 0x0f;
  return String((hmac.readUInt32BE(desfase) & 0x7fffffff) % 1_000_000).padStart(6, "0");
}

/** Espera al siguiente periodo de 30 s: un código TOTP no se acepta dos veces. */
export function msHastaSiguienteCodigo(ahora = Date.now()): number {
  return 30_000 - (ahora % 30_000) + 500;
}
