import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';
import type { PersonaSinCuenta } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const caller = await requireCallerAuth(req, res, 'cuentas:gestionar');
  if (!caller) return;

  // Alcance territorial: un SUCURSAL sin sede asignada no puede acotarse, así que se deniega
  // (sin esto el listado quedaría sin filtrar y mostraría a todo el personal)
  const idSucursalAlcance = caller.alcance_tipo === 'SUCURSAL' ? caller.id_sucursal : undefined;
  if (idSucursalAlcance === null) {
    return res.status(403).json({ error: 'Sin sucursal asignada' });
  }

  try {
    const supabase = createServerClientForReqRes(req, res);

    let query = supabase
      .from('personas')
      .select(`
        id, ci, nombres, apellidos, telefono,
        asignaciones_laborales!inner (
          id_sucursal,
          cargos ( nombre_cargo ),
          sucursales ( nombre_sucursal )
        )
      `)
      .is('auth_user_id', null)
      .is('fecha_baja', null)
      .eq('asignaciones_laborales.estado', 'activo');

    // FISCALIZADOR solo ve personas de su propia sucursal
    if (idSucursalAlcance !== undefined) {
      query = query.eq('asignaciones_laborales.id_sucursal', idSucursalAlcance);
    }

    const { data, error } = await query;

    if (error) {
      logger.error('Error fetching personas sin cuenta:', error);
      return res.status(500).json({ error: 'Error al obtener colaboradores' });
    }

    const personas: PersonaSinCuenta[] = (data ?? []).map((p) => {
      const asignacion = Array.isArray(p.asignaciones_laborales)
        ? p.asignaciones_laborales[0]
        : p.asignaciones_laborales;

      return {
        id: p.id,
        ci: p.ci,
        nombres: p.nombres,
        apellidos: p.apellidos,
        telefono: p.telefono,
        cargo_nombre: (asignacion?.cargos as { nombre_cargo: string } | null)?.nombre_cargo ?? '',
        sucursal_nombre: (asignacion?.sucursales as { nombre_sucursal: string } | null)?.nombre_sucursal ?? '',
        id_sucursal: asignacion?.id_sucursal ?? 0,
      };
    });

    return res.status(200).json({ personas });
  } catch (err) {
    logger.error('Error en /api/admin/personas-sin-cuenta:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
