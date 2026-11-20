import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeCobertura, PERMISO_MAPA } from '@/utils/clientesScope';
import { coberturaDeAlcance } from '@/lib/cobertura';
import { logger } from '@/lib/logger';

// Cobertura de las rutas del alcance del solicitante (CU-13, ADR-005 D3 y D4). El Vendedor no la consulta.
// El alcance sale de los roles de la sesión, nunca del cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, PERMISO_MAPA);
  if (!caller) return;

  const alcance = alcanceDeCobertura(caller);
  if (alcance.tipo === 'denegado') return res.status(403).json({ error: 'Sin alcance para consultar la cobertura' });

  try {
    const resultado = await coberturaDeAlcance(alcance, caller.id_persona);
    if (!resultado.ok) return res.status(500).json({ error: 'No se pudo obtener la cobertura.' });
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/cobertura:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
