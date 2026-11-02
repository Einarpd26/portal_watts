import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { cambiarFrecuenciaVisita, quitarVisita } from '@/lib/visitas';
import { parsearIdVisita, respuestaDeErrorVisita, validarCambioFrecuencia } from '@/utils/visitaValidation';
import { logger } from '@/lib/logger';

// Una visita propia (CU-09): PATCH cambia su frecuencia y DELETE la quita. El supervisor sale de la sesión.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const idVisita = parsearIdVisita(req.query.id);
  if (idVisita === null) return res.status(400).json({ error: 'ID de visita inválido' });

  try {
    if (req.method === 'PATCH') {
      const cuerpo = validarCambioFrecuencia(req.body);
      if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

      const resultado = await cambiarFrecuenciaVisita(caller.id_persona, idVisita, cuerpo.frecuencia);
      if (!resultado.ok) {
        const { status, mensaje } = respuestaDeErrorVisita(resultado.error);
        return res.status(status).json({ error: mensaje });
      }
      await registrarBitacoraDesdeSesion(
        caller,
        'PLANIFICACION',
        'CAMBIAR_FRECUENCIA_VISITA',
        `Se cambió la frecuencia de la visita ID ${idVisita} a ${cuerpo.frecuencia}`,
        req,
        { id_visita: idVisita, frecuencia: cuerpo.frecuencia }
      );
      return res.status(200).json({ success: true });
    }

    const resultado = await quitarVisita(caller.id_persona, idVisita);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorVisita(resultado.error);
      return res.status(status).json({ error: mensaje });
    }
    await registrarBitacoraDesdeSesion(caller, 'PLANIFICACION', 'QUITAR_VISITA', `Se quitó la visita ID ${idVisita}`, req, {
      id_visita: idVisita,
    });
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en ${req.method} /api/planificacion/visitas/${idVisita}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
