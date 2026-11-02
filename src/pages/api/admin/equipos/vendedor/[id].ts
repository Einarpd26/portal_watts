import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { asignarVendedorAEquipo, sucursalDeAlcance } from '@/lib/equipos';
import { parsearId, respuestaDeError, validarAsignacion } from '@/utils/equipoValidation';
import { logger } from '@/lib/logger';

// Equipo del supervisor (CU-08): asigna, cambia o quita el supervisor de un vendedor. Un vendedor
// pertenece a un solo equipo; al cambiarlo o quitarlo, su slot queda vacío y conserva sus rutas.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const idVendedor = parsearId(req.query.id);
  if (idVendedor === null) {
    return res.status(400).json({ error: 'ID de vendedor inválido' });
  }

  const cuerpo = validarAsignacion(req.body);
  if (!cuerpo.ok) {
    return res.status(400).json({ error: cuerpo.mensaje });
  }

  const alcance = sucursalDeAlcance(caller);
  if (alcance === 'denegado') {
    return res.status(403).json({ error: 'Solo puedes administrar equipos de tu sucursal.' });
  }

  try {
    const resultado = await asignarVendedorAEquipo(idVendedor, cuerpo.idSupervisor, alcance);
    if (!resultado.ok) {
      const { status, mensaje } = respuestaDeError(resultado.error);
      return res.status(status).json({ error: mensaje });
    }

    const { anterior, slots_liberados } = resultado.data;
    // Si no cambió nada (mismo supervisor, o ya estaba sin supervisor) no se audita
    if (anterior !== cuerpo.idSupervisor) {
      const quitar = cuerpo.idSupervisor === null;
      await registrarBitacoraDesdeSesion(
        caller,
        'PERSONAL',
        quitar ? 'QUITAR_VENDEDOR_EQUIPO' : 'ASIGNAR_VENDEDOR_EQUIPO',
        quitar
          ? `Se quitó al vendedor ID ${idVendedor} del equipo del supervisor ID ${anterior}`
          : `Se asignó el vendedor ID ${idVendedor} al supervisor ID ${cuerpo.idSupervisor}`,
        req,
        { id_vendedor: idVendedor, id_supervisor: cuerpo.idSupervisor, id_supervisor_anterior: anterior, slots_liberados }
      );
    }
    return res.status(200).json({ success: true, slots_liberados });
  } catch (err: unknown) {
    logger.error(`Error en /api/admin/equipos/vendedor/${idVendedor}:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
