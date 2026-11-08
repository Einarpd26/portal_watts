import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { mapaDeSupervisor } from '@/lib/mapaPlanificacion';
import { logger } from '@/lib/logger';

// Polígonos de las rutas y contorno de las zonas del supervisor, para planificar sobre el mapa (ADR-004).
// El supervisor sale de la sesión, nunca del cliente; quien no es supervisor no tiene zonas propias.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  if (!caller.roles.some((r) => r.codigo === 'SUPERVISOR')) {
    return res.status(200).json({ rutas: [], contornos: [] });
  }

  try {
    const resultado = await mapaDeSupervisor(caller.id_persona);
    if (!resultado.ok) return res.status(500).json({ error: 'No se pudo obtener el mapa de planificación.' });
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/planificacion/mapa:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
