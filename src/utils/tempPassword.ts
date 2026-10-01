import { randomInt } from 'crypto';

// Vigencia de la contraseña temporal asignada al crear un acceso (CU-02).
export const TEMP_PASSWORD_TTL_HOURS = 72;

// Sin caracteres ambiguos (0/O, 1/l/I) para que sea fácil de dictar o copiar.
const UPPER = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const LOWER = 'abcdefghijkmnpqrstuvwxyz';
const DIGITS = '23456789';
const ALL = UPPER + LOWER + DIGITS;

const pick = (chars: string) => chars[randomInt(chars.length)];

/**
 * Genera una contraseña temporal criptográficamente aleatoria que cumple
 * utils/passwordPolicy (mayúscula, minúscula y número, mínimo 8).
 * Solo servidor: usa node:crypto.
 */
export function generateTempPassword(length = 14): string {
  const chars = [pick(UPPER), pick(LOWER), pick(DIGITS)];
  while (chars.length < length) chars.push(pick(ALL));

  // Fisher-Yates para que los caracteres garantizados no queden siempre al inicio
  for (let i = chars.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

export function tempPasswordExpiry(now = Date.now()): string {
  return new Date(now + TEMP_PASSWORD_TTL_HOURS * 3600 * 1000).toISOString();
}
