import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeCobertura, PERMISO_MAPA, puedeConsultarPlanificacion } from '@/utils/clientesScope';
import { consultaDePlanificacion } from '@/lib/consultaPlanificacion';
import { logger } from '@/lib/logger';

// Consulta de la planificación de todas las rutas del alcance del solicitante (CU-10). Solo lectura.
// Es de supervisión: la consultan Gerencia y Fiscalizador. El Supervisor tiene la suya en su pantalla de planificación y el
// Vendedor, la de su slot. El alcance sale de la sesión, nunca del cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, PERMISO_MAPA);
  if (!caller) return;

  if (!puedeConsultarPlanificacion(caller)) return res.status(403).json({ error: 'Sin permiso para consultar la planificación' });
  const alcance = alcanceDeCobertura(caller);
  if (alcance.tipo === 'denegado') return res.status(403).json({ error: 'Sin alcance para consultar la planificación' });

  try {
    const resultado = await consultaDePlanificacion(alcance, caller.id_persona);
    if (!resultado.ok) return res.status(500).json({ error: 'No se pudo obtener la planificación.' });
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/planificacion/consulta:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
