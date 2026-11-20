import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeClientes, PERMISO_MAPA } from '@/utils/clientesScope';
import { mapaDeClientes } from '@/lib/clientes';
import { logger } from '@/lib/logger';

// Clientes clasificados (ABC por ruta) con sus rutas, para el mapa de CU-12 (ADR-005).
// El alcance sale de los roles de la sesión, nunca del cliente: el navegador no recibe clientes ajenos.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, PERMISO_MAPA);
  if (!caller) return;

  const alcance = alcanceDeClientes(caller);
  if (alcance.tipo === 'denegado') return res.status(403).json({ error: 'Sin alcance para consultar clientes' });

  try {
    const resultado = await mapaDeClientes(alcance, caller.id_persona);
    if (!resultado.ok) return res.status(500).json({ error: 'No se pudo obtener el mapa de clientes.' });
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/clientes/mapa:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
