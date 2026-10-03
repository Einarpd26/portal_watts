import type { IncomingMessage } from 'node:http';

/**
 * Extrae la dirección IP del cliente desde los encabezados HTTP o el socket.
 */
export function getClientIp(req: IncomingMessage & { headers: Record<string, string | string[] | undefined> }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return forwarded[0].trim();
  }
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp.trim();
  }
  return req.socket?.remoteAddress || '127.0.0.1';
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
