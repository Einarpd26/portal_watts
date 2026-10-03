import type { NextApiRequest } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import type { UserSession } from '@/types';
import type { Json } from '@/types/database';
import { getClientIp, getClientUserAgent, formatToUtcString } from '@/utils/bitacoraUtils';

export { getClientIp, getClientUserAgent, formatToUtcString };

export type ModuloBitacora =
  | 'AUTENTICACION'
  | 'ACCESOS'
  | 'PERSONAL'
  | 'SISTEMA';

export type AccionBitacora =
  | 'INICIO_SESION'
  | 'CIERRE_SESION'
  | 'LOGIN_FALLIDO'
  | 'CREAR_PERSONAL'
  | 'EDITAR_PERSONAL'
  | 'BAJA_PERSONAL'
  | 'INVITAR_USUARIO'
  | 'REVOCAR_ACCESO'
  | 'CAMBIO_PASSWORD'
  | string;

export interface RegistrarBitacoraParams {
  id_persona?: number | null;
  auth_user_id?: string | null;
  usuario_email: string;
  usuario_rol?: string | null;
  modulo: ModuloBitacora;
  accion: AccionBitacora;
  descripcion: string;
  direccion_ip?: string | null;
  user_agent?: string | null;
  detalles_json?: Record<string, unknown> | null;
  created_at?: string;
}

/**
 * Registra un evento en la tabla de bitácora de auditoría.
 * La marca de tiempo se almacena estrictamente en UTC 0.
 */
export async function registrarBitacora(
  params: RegistrarBitacoraParams,
  req?: NextApiRequest
): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const direccion_ip = params.direccion_ip ?? (req ? getClientIp(req) : null);
    const user_agent = params.user_agent ?? (req ? getClientUserAgent(req) : null);

    // Persistencia estricta en UTC 0 en formato estándar ISO-8601
    const createdAtUtc = params.created_at ?? new Date().toISOString();

    const { error } = await supabase.from('bitacora').insert({
      id_persona: params.id_persona ?? null,
      auth_user_id: params.auth_user_id ?? null,
      usuario_email: params.usuario_email,
      usuario_rol: params.usuario_rol ?? null,
      modulo: params.modulo,
      accion: params.accion,
      descripcion: params.descripcion,
      direccion_ip,
      user_agent,
      detalles_json: (params.detalles_json as unknown as Json) ?? {},
      created_at: createdAtUtc,
    });

    if (error) {
      console.error('Error insertando evento en bitácora:', error);
      return false;
    }

    return true;
  } catch (err: unknown) {
    console.error('Excepción no controlada en registrarBitacora:', err);
    return false;
  }
}

/**
 * Helper para registrar eventos de auditoría originados por un usuario autenticado con sesión válida.
 */
export async function registrarBitacoraDesdeSesion(
  session: UserSession,
  modulo: ModuloBitacora,
  accion: AccionBitacora,
  descripcion: string,
  req?: NextApiRequest,
  detalles?: Record<string, unknown>
): Promise<boolean> {
  return registrarBitacora(
    {
      id_persona: session.id_persona,
      usuario_email: session.email,
      usuario_rol: session.rol_codigo,
      modulo,
      accion,
      descripcion,
      detalles_json: detalles,
    },
    req
  );
}
