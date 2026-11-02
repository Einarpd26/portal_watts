import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { asignarVendedorASlot, eliminarSlot, renombrarSlot } from '@/lib/slots';
import { parsearIdSlot, respuestaDeErrorSlot, validarAsignacionSlot, validarRenombre } from '@/utils/slotValidation';
import { logger } from '@/lib/logger';

// Un slot propio (CU-08): PUT asigna un vendedor del equipo o lo deja vacío (A1), PATCH lo renombra y
// DELETE lo elimina (su vendedor queda libre). El supervisor sale de la sesión, nunca del cliente.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT' && req.method !== 'PATCH' && req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'planificacion:asignar');
  if (!caller) return;

  const idSlot = parsearIdSlot(req.query.id);
  if (idSlot === null) return res.status(400).json({ error: 'ID de slot inválido' });

  try {
    if (req.method === 'PATCH') {
      const renombre = validarRenombre(req.body);
      if (!renombre.ok) return res.status(400).json({ error: renombre.mensaje });
      const resultado = await renombrarSlot(idSlot, caller.id_persona, renombre.nombre);
      if (!resultado.ok) {
        const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
        return res.status(status).json({ error: mensaje });
      }
      return res.status(200).json({ success: true });
    }

    if (req.method === 'DELETE') {
      const resultado = await eliminarSlot(idSlot, caller.id_persona);
      if (!resultado.ok) {
        const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
        return res.status(status).json({ error: mensaje });
      }
      await registrarBitacoraDesdeSesion(caller, 'PLANIFICACION', 'ELIMINAR_SLOT', `Se eliminó el slot ID ${idSlot}`, req, {
        id_slot: idSlot,
        id_supervisor: caller.id_persona,
      });
      return res.status(200).json({ success: true });
    }

    const cuerpo = validarAsignacionSlot(req.body);
    if (!cuerpo.ok) return res.status(400).json({ error: cuerpo.mensaje });

    const resultado = await asignarVendedorASlot(idSlot, caller.id_persona, cuerpo.idVendedor);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeErrorSlot(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    const vaciar = cuerpo.idVendedor === null;
    await registrarBitacoraDesdeSesion(
      caller,
      'PLANIFICACION',
      vaciar ? 'QUITAR_VENDEDOR_SLOT' : 'ASIGNAR_VENDEDOR_SLOT',
      vaciar
        ? `Se dejó vacío el slot ID ${idSlot}`
        : `Se asignó el vendedor ID ${cuerpo.idVendedor} al slot ID ${idSlot}`,
      req,
      { id_slot: idSlot, id_vendedor: cuerpo.idVendedor, id_supervisor: caller.id_persona }
    );
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en ${req.method} /api/planificacion/slots/${idSlot}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
