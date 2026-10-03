import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { desbloquearCuentaAdmin } from '@/lib/lockout';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. RBAC: Requiere permiso de gestión de cuentas
  const caller = await requireCallerAuth(req, res, 'cuentas:gestionar');
  if (!caller) return;

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'El email del usuario a desbloquear es requerido' });
  }

  try {
    const success = await desbloquearCuentaAdmin(email, caller, req);
    if (!success) {
      return res.status(500).json({ error: 'No fue posible desbloquear la cuenta' });
    }

    return res.status(200).json({
      success: true,
      message: `La cuenta ${email} fue desbloqueada exitosamente`,
    });
  } catch (err: unknown) {
    logger.error('Error en unlock-user:', err);
    return res.status(500).json({ error: 'Error interno al desbloquear usuario' });
  }
}
