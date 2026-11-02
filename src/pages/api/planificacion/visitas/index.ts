import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { agregarVisita } from '@/lib/visitas';
import { respuestaDeErrorVisita, validarNuevaVisita } from '@/utils/visitaValidation';
import { logger } from '@/lib/logger';

// Planifica una ruta en un slot y un día (CU-09). El supervisor sale de la sesión, nunca del cliente.
// Una ruta puede planificarse más de una vez: el sistema lo permite y la grilla la marca duplicada (RN-04).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const cuerpo = validarNuevaVisita(req.body);
  if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

  try {
    const resultado = await agregarVisita(caller.id_persona, cuerpo.idSlot, cuerpo.idRuta, cuerpo.dia, cuerpo.frecuencia);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorVisita(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'PLANIFICACION',
      'PLANIFICAR_RUTA',
      `Se planificó la ruta ID ${cuerpo.idRuta} en el slot ID ${cuerpo.idSlot} (${cuerpo.dia}, ${cuerpo.frecuencia})`,
      req,
      { id_visita: resultado.data.id, id_slot: cuerpo.idSlot, id_ruta: cuerpo.idRuta, dia: cuerpo.dia, frecuencia: cuerpo.frecuencia }
    );
    return res.status(201).json({ success: true, id: resultado.data.id });
  } catch (err: unknown) {
    logger.error('Error en POST /api/planificacion/visitas:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
