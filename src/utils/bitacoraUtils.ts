import type { IncomingMessage } from 'node:http';

/**
 * Extrae la dirección IP del cliente.
 *
 * `X-Forwarded-For` y `X-Real-IP` los controla el cliente salvo que un proxy propio
 * los sobrescriba, y la política de bloqueo de login depende de esta IP: confiar en
 * ellos a ciegas permitiría rotar IPs falsas y evadir el bloqueo. Por eso, por defecto
 * (TRUSTED_PROXY_HOPS=0) solo se usa la IP del socket. Con N proxys de confianza
 * delante, se toma la entrada N contando desde la derecha de X-Forwarded-For.
 */
export function getClientIp(
  req: IncomingMessage & { headers: Record<string, string | string[] | undefined> },
  trustedHops: number = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '0', 10) || 0
): string {
  if (trustedHops > 0) {
    const raw = req.headers['x-forwarded-for'];
    const chain = (Array.isArray(raw) ? raw.join(',') : raw ?? '')
      .split(',')
      .map((ip) => ip.trim())
      .filter(Boolean);
    const candidate = chain[chain.length - trustedHops];
    if (candidate) return candidate;
  }
  return req.socket?.remoteAddress || 'desconocida';
}

/**
 * Extrae el agente de usuario (User-Agent) desde la petición HTTP.
 */
export function getClientUserAgent(req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }): string {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : 'Desconocido';
}

/**
 * Da formato estricto a una fecha en estándar universal UTC 0.
 * Garantiza consistencia absoluta y previene desfases de zona horaria local.
 * Ejemplo de salida: "2026-10-02 21:15:00 UTC"
 */
export function formatToUtcString(dateInput?: string | Date | null): string {
  if (!dateInput) return 'N/A';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return 'Fecha inválida';

  const pad = (n: number) => n.toString().padStart(2, '0');
  const year = d.getUTCFullYear();
  const month = pad(d.getUTCMonth() + 1);
  const day = pad(d.getUTCDate());
  const hours = pad(d.getUTCHours());
  const minutes = pad(d.getUTCMinutes());
  const seconds = pad(d.getUTCSeconds());

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} UTC`;
}
