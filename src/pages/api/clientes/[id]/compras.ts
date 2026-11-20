import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { alcanceDeClientes, PERMISO_MAPA } from '@/utils/clientesScope';
import { comprasDeCliente } from '@/lib/comprasCliente';
import { logger } from '@/lib/logger';

// Ticket promedio y últimas compras de un cliente, para su ficha en el mapa de CU-12 (ADR-005).
// El alcance sale de los roles de la sesión: un cliente de otra ruta se responde como inexistente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, PERMISO_MAPA);
  if (!caller) return;

  const idCliente = Number(req.query.id);
  if (!Number.isInteger(idCliente) || idCliente <= 0) return res.status(400).json({ error: 'Cliente inválido' });

  const alcance = alcanceDeClientes(caller);
  if (alcance.tipo === 'denegado') return res.status(403).json({ error: 'Sin alcance para consultar clientes' });

  try {
    const resultado = await comprasDeCliente(alcance, caller.id_persona, idCliente);
    if (!resultado.ok) {
      return resultado.motivo === 'no_encontrado'
        ? res.status(404).json({ error: 'Cliente no encontrado' })
        : res.status(500).json({ error: 'No se pudieron obtener las compras del cliente.' });
    }
    return res.status(200).json(resultado.data);
  } catch (err: unknown) {
    logger.error('Error en GET /api/clientes/[id]/compras:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
