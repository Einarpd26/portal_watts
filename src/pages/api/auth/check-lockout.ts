import type { NextApiRequest, NextApiResponse } from 'next';
import { verificarBloqueoCuenta } from '@/lib/lockout';
import { logger } from '@/lib/logger';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'El email es requerido' });
  }

  try {
    const evaluation = await verificarBloqueoCuenta(email);
    return res.status(200).json({
      locked: evaluation.bloqueado,
      evaluation,
    });
  } catch (err: unknown) {
    logger.error('Error en check-lockout:', err);
    return res.status(500).json({ error: 'Error verificando estado de bloqueo' });
  }
}
