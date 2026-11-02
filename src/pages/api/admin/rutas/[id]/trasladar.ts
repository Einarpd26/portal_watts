import type { NextApiRequest, NextApiResponse } from 'next';
import { registrarBitacoraDesdeSesion } from '@/lib/bitacora';
import { obtenerRuta, trasladarRuta } from '@/lib/rutas';
import { resolverContextoRutas } from '@/lib/rutasApi';
import { alcanceDeRutas } from '@/utils/rutaScope';
import { mensajeCoberturaTraslado, mensajeInvasionTraslado } from '@/utils/invasionZona';
import { logger } from '@/lib/logger';

// Traslado de ruta entre zonas (CU-06): Gerencia y Fiscalizador; Supervisor no puede trasladar.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const contexto = await resolverContextoRutas(req, res);
  if (!contexto) return;
  const { caller, zonas, idsZona } = contexto;

  if (alcanceDeRutas(caller).tipo === 'supervisor') {
    return res.status(403).json({ error: 'Los supervisores no pueden trasladar rutas.' });
  }

  const id = Number(typeof req.query.id === 'string' ? req.query.id : '');
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: 'ID de ruta inválido' });
  }

  const { id_zona_destino } = (req.body ?? {}) as { id_zona_destino?: unknown };
  if (!(typeof id_zona_destino === 'number' && Number.isInteger(id_zona_destino) && id_zona_destino > 0)) {
    return res.status(400).json({ error: 'Indica la zona de destino.' });
  }

  try {
    const ruta = await obtenerRuta(id);
    if (!ruta.ok) {
      return res
        .status(ruta.error === 'no_encontrada' ? 404 : 500)
        .json({ error: ruta.error === 'no_encontrada' ? 'La ruta no existe.' : 'No se pudo consultar la ruta.' });
    }
    if (!idsZona.has(ruta.data.id_zona)) {
      return res.status(403).json({ error: 'Solo puedes administrar rutas de tu alcance territorial.' });
    }
    if (ruta.data.id_zona === id_zona_destino) {
      return res.status(400).json({ error: 'La ruta ya pertenece a esa zona.' });
    }

    const zonaDestino = zonas.find((z) => z.id === id_zona_destino);
    if (!zonaDestino) {
      return res.status(400).json({ error: 'La zona de destino no existe o está fuera de tu alcance.' });
    }
    if (zonaDestino.id_sucursal !== ruta.data.id_sucursal) {
      return res.status(400).json({ error: 'No se puede trasladar una ruta a una zona de otra sucursal.' });
    }

    const resultado = await trasladarRuta(id, id_zona_destino, idsZona);
    if (!resultado.ok) {
      switch (resultado.error) {
        case 'invasion':
          // Regla de no invasión (ADR-002 D7): la envolvente de la zona destino cubriría rutas de otras zonas
          return res.status(409).json({
            error: mensajeInvasionTraslado(zonaDestino.codigo_zona, resultado.conflictos ?? []),
            conflictos: resultado.conflictos ?? [],
          });
        case 'cobertura':
          // La envolvente de la zona de origen, sin la ruta, la seguiría cubriendo (ADR-002 D7 ampliada)
          return res.status(409).json({
            error: mensajeCoberturaTraslado(resultado.conflictos ?? []),
            conflictos: resultado.conflictos ?? [],
          });
        case 'no_encontrada':
          return res.status(404).json({ error: 'La ruta no existe.' });
        case 'zona_invalida':
          return res.status(400).json({ error: 'La zona de destino no existe.' });
        default:
          return res.status(500).json({ error: 'No se pudo realizar el traslado.' });
      }
    }

    const zonaOrigen = zonas.find((z) => z.id === ruta.data.id_zona);
    await registrarBitacoraDesdeSesion(
      caller,
      'TERRITORIO',
      'TRASLADAR_RUTA',
      `Se trasladó la ruta ID ${id} (${ruta.data.codigo_ruta}) de zona ${zonaOrigen?.codigo_zona ?? ruta.data.id_zona} a zona ${zonaDestino.codigo_zona}`,
      req,
      {
        id,
        codigo_ruta: ruta.data.codigo_ruta,
        id_zona_origen: ruta.data.id_zona,
        id_zona_destino,
        id_sucursal: ruta.data.id_sucursal,
        // RF-09: el traslado elimina la planificación vigente de la ruta
        planificaciones_eliminadas: resultado.planificaciones_eliminadas,
      }
    );
    return res.status(200).json({ id, planificaciones_eliminadas: resultado.planificaciones_eliminadas });
  } catch (err: unknown) {
    logger.error(`Error en /api/admin/rutas/${id}/trasladar:`, err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
  }
}
