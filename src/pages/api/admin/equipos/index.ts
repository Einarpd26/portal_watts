import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { listarEquipos } from '@/lib/equipos';
import { logger } from '@/lib/logger';

// Equipos de los supervisores (CU-08): supervisores con sus vendedores, supervisores inactivos que
// esperan reemplazo y vendedores sin supervisor. Un alcance SUCURSAL solo ve su sede.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  try {
    const resultado = await listarEquipos(caller);
    if (!resultado.ok) return res.status(500).json({ error: 'No se pudieron consultar los equipos.' });
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/admin/equipos:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
