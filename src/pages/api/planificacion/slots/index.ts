import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { crearSlot, listarSlots } from '@/lib/slots';
import { respuestaDeErrorSlot, validarNuevoSlot } from '@/utils/slotValidation';
import { logger } from '@/lib/logger';

// Slots del supervisor (CU-08): lista los de su equipo (GET) y agrega uno vacío (POST).
// Cada supervisor opera solo sobre sus propios slots: el id sale de la sesión, nunca del cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const esSupervisor = caller.roles.some((r) => r.codigo === 'SUPERVISOR');

  try {
    if (req.method === 'GET') {
      // Quien no es supervisor (p. ej. Gerencia) no tiene equipo propio: se informa, no es un error
      if (!esSupervisor) return res.status(200).json({ slots: [], disponibles: [], es_supervisor: false });
      const resultado = await listarSlots(caller.id_persona);
      if (!resultado.ok) return res.status(500).json({ error: 'No se pudieron consultar los slots.' });
      return res.status(200).json({ ...resultado.data, es_supervisor: true });
    }

    const cuerpo = validarNuevoSlot(req.body);
    if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

    const resultado = await crearSlot(caller.id_persona, cuerpo.nombre);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'PLANIFICACION',
      'CREAR_SLOT',
      `Se creó el slot ID ${resultado.data.id}`,
      req,
      { id_slot: resultado.data.id, id_supervisor: caller.id_persona }
    );
    return res.status(201).json({ success: true, id: resultado.data.id });
  } catch (err: unknown) {
    logger.error(`Error en ${req.method} /api/planificacion/slots:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
