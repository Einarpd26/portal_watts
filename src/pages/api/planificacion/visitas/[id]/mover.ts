import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { moverVisita } from '@/lib/visitas';
import { parsearIdVisita, respuestaDeErrorVisita, validarMovimientoVisita } from '@/utils/visitaValidation';
import { logger } from '@/lib/logger';

// Mueve una visita propia a otro slot y día (CU-09): es lo que hace el arrastre en la grilla. Conserva
// el id y la frecuencia de la visita. El supervisor sale de la sesión, nunca del cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const idVisita = parsearIdVisita(req.query.id);
  if (idVisita === null) return res.status(400).json({ error: 'ID de visita inválido' });

  const cuerpo = validarMovimientoVisita(req.body);
  if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

  try {
    const resultado = await moverVisita(caller.id_persona, idVisita, cuerpo.idSlot, cuerpo.dia);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorVisita(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'PLANIFICACION',
      'MOVER_VISITA',
      `Se movió la visita ID ${idVisita} al slot ID ${cuerpo.idSlot} (${cuerpo.dia})`,
      req,
      { id_visita: idVisita, id_slot: cuerpo.idSlot, dia: cuerpo.dia }
    );
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en POST /api/planificacion/visitas/${idVisita}/mover:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
