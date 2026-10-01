import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';
import type { PersonaConAsignacion } from '@/types';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const caller = await requireCallerAuth(req, res, 'personal:gestionar');
  if (!caller) return;

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('personas')
    .select(`
      id, ci, nombres, apellidos, telefono, auth_user_id, fecha_baja,
      asignaciones_laborales (
        id, estado, fecha_inicio, id_cargo,
        cargos ( nombre_cargo ),
        sucursales ( id, nombre_sucursal )
      )
    `)
    .is('fecha_baja', null)
    .order('apellidos');

  if (error) {
    console.error('Error fetching personas:', error);
    return res.status(500).json({ error: 'Error al obtener colaboradores' });
  }

  let rows = data ?? [];

  // FISCALIZADOR: filtrar solo personas con asignación activa en su sucursal
  if (caller.alcance_tipo === 'SUCURSAL') {
    rows = rows.filter((p) =>
      p.asignaciones_laborales?.some(
        (a) => a.estado === 'activo' && (a.sucursales as { id: number } | null)?.id === caller.id_sucursal
      )
    );
  }

  const personas: PersonaConAsignacion[] = rows.map((p) => {
    const active = p.asignaciones_laborales?.find((a) => a.estado === 'activo');
    const suc = active?.sucursales as { id: number; nombre_sucursal: string } | null;
    const cargo = active?.cargos as { nombre_cargo: string } | null;
    return {
      id: p.id,
      ci: p.ci,
      nombres: p.nombres,
      apellidos: p.apellidos,
      telefono: p.telefono,
      auth_user_id: p.auth_user_id,
      fecha_baja: p.fecha_baja,
      asignacion: active
        ? {
            id: active.id,
            estado: active.estado,
            fecha_inicio: active.fecha_inicio,
            cargo_id: active.id_cargo,
            cargo_nombre: cargo?.nombre_cargo ?? '',
            sucursal_id: suc?.id ?? 0,
            sucursal_nombre: suc?.nombre_sucursal ?? '',
          }
        : null,
    };
  });

  return res.status(200).json({ personas });
}
