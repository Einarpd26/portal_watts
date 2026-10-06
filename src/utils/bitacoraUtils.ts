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

/**
 * Arma el filtro `or` de PostgREST que restringe la bitácora al personal de una sucursal.
 * Un evento pertenece a la sucursal si lo originó alguien de ella (`id_persona` o
 * `usuario_email`, este último cubre logins fallidos sin sesión) o si recae sobre uno de
 * sus colaboradores (`detalles_json.id_persona`, que registran las acciones administrativas).
 * Devuelve null si la sucursal no tiene personal: no hay nada que mostrar.
 */
export function construirFiltroBitacoraSucursal(idsPersona: number[], emails: string[]): string | null {
  const clauses: string[] = [];

  if (idsPersona.length > 0) {
    const ids = idsPersona.join(',');
    clauses.push(`id_persona.in.(${ids})`, `detalles_json->>id_persona.in.(${ids})`);
  }

  if (emails.length > 0) {
    const quoted = emails.map((e) => `"${e.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`).join(',');
    clauses.push(`usuario_email.in.(${quoted})`);
  }

  return clauses.length > 0 ? clauses.join(',') : null;
}

/** Acciones que registra la bitácora (filtro del panel de consulta y tipado de los emisores). */
export const ACCIONES_BITACORA = [
  'INICIO_SESION',
  'CIERRE_SESION',
  'LOGIN_FALLIDO',
  'LOGIN_RECHAZADO',
  'BLOQUEO_TEMPORAL_15M',
  'BLOQUEO_TEMPORAL_1H',
  'BLOQUEO_PERMANENTE',
  'DESBLOQUEO_CUENTA',
  'ALERTA_ATAQUE_DISTRIBUIDO',
  'SOLICITUD_RECUPERACION_PASSWORD',
  'RECUPERACION_PASSWORD',
  'CAMBIO_PASSWORD',
  'CREAR_PERSONAL',
  'EDITAR_PERSONAL',
  'BAJA_PERSONAL',
  'INVITAR_USUARIO',
  'REVOCAR_ACCESO',
  'CREAR_SUCURSAL',
  'EDITAR_SUCURSAL',
  'ELIMINAR_SUCURSAL',
  'CREAR_CARGO',
  'EDITAR_CARGO',
  'ELIMINAR_CARGO',
] as const;
