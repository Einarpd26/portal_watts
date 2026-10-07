import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import { desbloquearCuentaAdmin } from '@/lib/lockout';
import { enAlcanceDeSucursal } from '@/utils/sucursalScope';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. RBAC: Requiere permiso de gestión de cuentas
  const caller = await requireCallerAuth(req, res, 'cuentas:gestionar');
  if (!caller) return;

  // 2. El cliente indica a quién desbloquear por id; el correo lo resuelve el servidor
  const { id_persona } = req.body as { id_persona?: unknown };
  if (typeof id_persona !== 'number' || !Number.isInteger(id_persona)) {
    return res.status(400).json({ error: 'El id del colaborador a desbloquear es requerido' });
  }

  try {
    const supabaseAdmin = createAdminClient();

    const { data: persona, error: personaError } = await supabaseAdmin
      .from('personas')
      .select('id, email, auth_user_id, usuario_roles ( id_sucursal )')
      .eq('id', id_persona)
      .maybeSingle();

    if (personaError) {
      logger.error('Error consultando persona en unlock-user:', personaError);
      return res.status(500).json({ error: 'Error interno al desbloquear usuario' });
    }
    if (!persona) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }
    if (!persona.auth_user_id || !persona.email) {
      return res.status(400).json({ error: 'Este colaborador no tiene acceso digital' });
    }

    // 3. Alcance territorial (CU-02 A2): un alcance SUCURSAL solo administra su propia sede.
    //    Sin sucursal asignada no se puede acotar, así que se deniega.
    const roles = Array.isArray(persona.usuario_roles)
      ? persona.usuario_roles
      : persona.usuario_roles
        ? [persona.usuario_roles]
        : [];
    if (!enAlcanceDeSucursal(caller, roles.map((r) => r.id_sucursal))) {
      return res.status(403).json({ error: 'No tienes permiso para desbloquear este usuario' });
    }

    const success = await desbloquearCuentaAdmin(persona.email, caller, req);
    if (!success) {
      return res.status(500).json({ error: 'No fue posible desbloquear la cuenta' });
    }

    return res.status(200).json({
      success: true,
      message: `La cuenta ${persona.email} fue desbloqueada exitosamente`,
    });
  } catch (err: unknown) {
    logger.error('Error en unlock-user:', err);
    return res.status(500).json({ error: 'Error interno al desbloquear usuario' });
  }
}
