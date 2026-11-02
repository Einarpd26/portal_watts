import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { reordenarSlots } from '@/lib/slots';
import { respuestaDeErrorSlot, validarOrdenSlots } from '@/utils/slotValidation';
import { logger } from '@/lib/logger';

// Guarda el orden de los slots del supervisor tras arrastrar una fila (CU-08 A2). Recibe el orden completo.
// No se audita: el orden es una preferencia de presentación, no un dato de negocio.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const cuerpo = validarOrdenSlots(req.body);
  if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

  try {
    const resultado = await reordenarSlots(caller.id_persona, cuerpo.ids);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
      return res.status(status).json({ error: mensaje });
    }
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error('Error en PUT /api/planificacion/slots/orden:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
