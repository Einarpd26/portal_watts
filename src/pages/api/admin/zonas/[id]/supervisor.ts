import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { asignarSupervisor, obtenerZona, quitarSupervisor } from '@/lib/zonas';
import { enAlcanceDeSucursal } from '@/utils/sucursalScope';
import { logger } from '@/lib/logger';

// Supervisor de zona (CU-07): asigna, cambia o quita el supervisor. Como máximo uno por zona.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'territorio:gestionar');
  if (!caller) return;

  const id = Number(typeof req.query.id === 'string' ? req.query.id : '');
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de zona inválido' });
  }

  const { id_persona } = (req.body ?? {}) as { id_persona?: unknown };
  const quitar = id_persona === null;
  if (!quitar && !(typeof id_persona === 'number' && Number.isInteger(id_persona) && id_persona > 0)) {
    return res.status(400).json({ error: 'Indica el supervisor o null para dejar la zona sin supervisor.' });
  }

  try {
    const zona = await obtenerZona(id);
    if (!zona.ok) {
      return res
        .status(zona.error === 'no_encontrada' ? 404 : 500)
        .json({ error: zona.error === 'no_encontrada' ? 'La zona no existe.' : 'No se pudo consultar la zona.' });
    }
    if (!enAlcanceDeSucursal(caller, [zona.data.id_sucursal])) {
      return res.status(403).json({ error: 'Solo puedes administrar zonas de tu sucursal' });
    }

    if (quitar) {
      const resultado = await quitarSupervisor(id);
      if (!resultado.ok) return res.status(500).json({ error: 'No se pudo quitar el supervisor.' });

      if (resultado.data.anterior !== null) {
        await registrarBitacoraDesdeSesion(
          caller,
          'TERRITORIO',
          'QUITAR_SUPERVISOR_ZONA',
          `Se dejó sin supervisor la zona ${zona.data.codigo_zona} (ID ${id})`,
          req,
          { id_zona: id, id_persona: resultado.data.anterior, id_sucursal: zona.data.id_sucursal }
        );
      }
      return res.status(200).json({ success: true });
    }

    const resultado = await asignarSupervisor(zona.data, id_persona as number);
    if (!resultado.ok) {
      if (resultado.error === 'supervisor_invalido') {
        return res.status(400).json({
          error: 'El colaborador no es un supervisor activo con acceso en la sucursal de la zona.',
        });
      }
      return res.status(500).json({ error: 'No se pudo asignar el supervisor.' });
    }

    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'ASIGNAR_SUPERVISOR_ZONA',
      `Se asignó el supervisor ID ${id_persona} a la zona ${zona.data.codigo_zona} (ID ${id})`,
      req,
      {
        id_zona: id,
        id_persona,
        id_persona_anterior: resultado.data.anterior,
        id_sucursal: zona.data.id_sucursal,
      }
    );
    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error(`Error en /api/admin/zonas/${id}/supervisor:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
