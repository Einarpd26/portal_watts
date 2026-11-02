import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { moverSlot } from '@/lib/slots';
import { parsearIdSlot, respuestaDeErrorSlot, validarMovimiento } from '@/utils/slotValidation';
import { logger } from '@/lib/logger';

// Reordena los slots del supervisor: sube o baja uno una posición (CU-08, A2).
// No se audita: el orden es una preferencia de presentación, no un dato de negocio.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const idSlot = parsearIdSlot(req.query.id);
  if (idSlot === null) return res.status(400).json({ error: 'ID de slot inválido' });

  const cuerpo = validarMovimiento(req.body);
  if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

  try {
    const resultado = await moverSlot(idSlot, caller.id_persona, cuerpo.direccion);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
      return res.status(status).json({ error: mensaje });
    }
    return res.status(200).json({ success: true, movido: resultado.data.movido });
  } catch (err: unknown) {
    logger.error(`Error en POST /api/planificacion/slots/${idSlot}/mover:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
