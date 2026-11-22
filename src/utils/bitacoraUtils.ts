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

/**
 * Neutraliza un término de búsqueda libre antes de interpolarlo en un filtro `or` de PostgREST.
 * Sin esto, caracteres con significado en la gramática de filtros (`,`, `(`, `)`, `"`, `\`) o en los
 * patrones LIKE (`%`, `_`, `*`) permitirían inyectar condiciones o comodines en la consulta. Se
 * eliminan para que el término se trate como texto literal dentro del `ilike`. Devuelve null si,
 * tras limpiarlo, no queda nada que buscar.
 */
export function sanitizarTerminoBusqueda(termino: string): string | null {
  const limpio = termino.replace(/[,()"\\%_*]/g, '').trim();
  return limpio.length > 0 ? limpio : null;
}

export type AlcanceBitacora =
  | { tipo: 'global' }
  | { tipo: 'denegado' }
  | { tipo: 'vacio' }
  | { tipo: 'filtro'; filtro: string };

export interface PersonalDeSucursal {
  ids: number[];
  emails: string[];
}

/**
 * Decide qué porción de la bitácora puede consultar el solicitante (ADR-001 §E):
 * - alcance global: toda;
 * - alcance SUCURSAL sin sede asignada: se deniega, porque no se puede acotar;
 * - alcance SUCURSAL sin personal en la sede: no hay nada que mostrar;
 * - alcance SUCURSAL con personal: el filtro `or` de PostgREST de su sede.
 */
export async function resolverAlcanceBitacora(
  solicitante: { alcance_tipo: string; id_sucursal: number | null },
  deps: { personalDeSucursal: (idSucursal: number) => Promise<PersonalDeSucursal> }
): Promise<AlcanceBitacora> {
  if (solicitante.alcance_tipo !== 'SUCURSAL') return { tipo: 'global' };
  if (solicitante.id_sucursal === null) return { tipo: 'denegado' };

  const personal = await deps.personalDeSucursal(solicitante.id_sucursal);
  const filtro = construirFiltroBitacoraSucursal(personal.ids, personal.emails);
  return filtro ? { tipo: 'filtro', filtro } : { tipo: 'vacio' };
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
  'CREAR_ZONA',
  'EDITAR_ZONA',
  'ELIMINAR_ZONA',
  'ASIGNAR_SUPERVISOR_ZONA',
  'QUITAR_SUPERVISOR_ZONA',
  'ASIGNAR_VENDEDOR_EQUIPO',
  'QUITAR_VENDEDOR_EQUIPO',
  'REEMPLAZAR_SUPERVISOR',
  'CREAR_SLOT',
  'ASIGNAR_VENDEDOR_SLOT',
  'QUITAR_VENDEDOR_SLOT',
  'ELIMINAR_SLOT',
  'PLANIFICAR_RUTA',
  'CAMBIAR_FRECUENCIA_VISITA',
  'QUITAR_VISITA',
  'MOVER_VISITA',
  'EXPORTAR_REPORTE',
] as const;

export interface BitacoraRow {
  id: number;
  id_persona: number | null;
  auth_user_id: string | null;
  usuario_email: string;
  usuario_rol: string | null;
  modulo: string;
  accion: string;
  descripcion: string;
  direccion_ip: string | null;
  user_agent: string | null;
  detalles_json: Record<string, unknown> | null;
  created_at: string;
}

export function getModuloBadgeClasses(modulo: string): string {
  switch (modulo) {
    case 'AUTENTICACION':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'ACCESOS':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'PERSONAL':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'TERRITORIO':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'PLANIFICACION':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    case 'SISTEMA':
      return 'bg-gray-100 text-gray-700 border-gray-200';
    default:
      return 'bg-neutral-50 text-neutral-700 border-neutral-200';
  }
}

export function getAccionBadgeClasses(accion: string): string {
  switch (accion) {
    case 'INICIO_SESION':
      return 'bg-emerald-100 text-emerald-800';
    case 'CIERRE_SESION':
      return 'bg-slate-100 text-slate-700';
    case 'LOGIN_FALLIDO':
    case 'LOGIN_RECHAZADO':
      return 'bg-red-100 text-red-800';
    case 'BLOQUEO_TEMPORAL_15M':
    case 'BLOQUEO_TEMPORAL_1H':
    case 'BLOQUEO_PERMANENTE':
    case 'ALERTA_ATAQUE_DISTRIBUIDO':
      return 'bg-orange-100 text-orange-800';
    case 'DESBLOQUEO_CUENTA':
    case 'SOLICITUD_RECUPERACION_PASSWORD':
    case 'RECUPERACION_PASSWORD':
      return 'bg-violet-100 text-violet-800';
    case 'CREAR_PERSONAL':
    case 'INVITAR_USUARIO':
    case 'CREAR_SUCURSAL':
    case 'CREAR_CARGO':
    case 'CREAR_ZONA':
    case 'ASIGNAR_SUPERVISOR_ZONA':
    case 'ASIGNAR_VENDEDOR_EQUIPO':
    case 'CREAR_SLOT':
    case 'ASIGNAR_VENDEDOR_SLOT':
    case 'PLANIFICAR_RUTA':
      return 'bg-sky-100 text-sky-800';
    case 'EDITAR_PERSONAL':
    case 'EDITAR_SUCURSAL':
    case 'EDITAR_CARGO':
    case 'EDITAR_ZONA':
    case 'CAMBIO_PASSWORD':
    case 'REEMPLAZAR_SUPERVISOR':
    case 'CAMBIAR_FRECUENCIA_VISITA':
    case 'MOVER_VISITA':
      return 'bg-amber-100 text-amber-800';
    case 'BAJA_PERSONAL':
    case 'REVOCAR_ACCESO':
    case 'ELIMINAR_SUCURSAL':
    case 'ELIMINAR_CARGO':
    case 'ELIMINAR_ZONA':
    case 'QUITAR_SUPERVISOR_ZONA':
    case 'QUITAR_VENDEDOR_EQUIPO':
    case 'QUITAR_VENDEDOR_SLOT':
    case 'ELIMINAR_SLOT':
    case 'QUITAR_VISITA':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

