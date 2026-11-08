import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { mapaDePlanificacionDeSupervisor } from '@/lib/equipos';
import { parsearId, respuestaDeError } from '@/utils/equipoValidation';
import { logger } from '@/lib/logger';

// Polígonos para ver sobre el mapa la planificación de un supervisor en solo lectura (ADR-004 D5):
// mismo permiso y alcance que la consulta de su planificación.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const idSupervisor = parsearId(req.query.id);
  if (idSupervisor === null) {
    return res.status(400).json({ error: 'ID de supervisor inválido' });
  }

  try {
    const resultado = await mapaDePlanificacionDeSupervisor(caller, idSupervisor);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeError(resultado.error);
      return res.status(status).json({ error: mensaje });
    }
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error(`Error en GET /api/admin/equipos/supervisor/${idSupervisor}/mapa:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
