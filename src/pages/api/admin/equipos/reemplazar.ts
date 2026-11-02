import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { reemplazarSupervisor, sucursalDeAlcance } from '@/lib/equipos';
import { respuestaDeError, validarReemplazo } from '@/utils/equipoValidation';
import { logger } from '@/lib/logger';

// Reemplazar supervisor (CU-08 A5, ADR-003 D6): traspasa el equipo y los slots, con su planificación,
// de un supervisor retirado a uno nuevo. Las zonas se asignan aparte (CU-07).
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const cuerpo = validarReemplazo(req.body);
  if (!cuerpo.ok) {
    return res.status(400).json({ error: cuerpo.mensaje });
  }

  const alcance = sucursalDeAlcance(caller);
  if (alcance === 'denegado') {
    return res.status(403).json({ error: 'Solo puedes administrar equipos de tu sucursal.' });
  }

  try {
    const resultado = await reemplazarSupervisor(cuerpo.idInactivo, cuerpo.idNuevo, alcance);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeError(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'PERSONAL',
      'REEMPLAZAR_SUPERVISOR',
      `Se reemplazó al supervisor ID ${cuerpo.idInactivo} por el ID ${cuerpo.idNuevo}`,
      req,
      {
        id_supervisor_anterior: cuerpo.idInactivo,
        id_supervisor: cuerpo.idNuevo,
        vendedores: resultado.data.vendedores,
        slots: resultado.data.slots,
      }
    );
    return res.status(200).json({ success: true, ...resultado.data });
  } catch (err: unknown) {
    logger.error('Error en POST /api/admin/equipos/reemplazar:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
