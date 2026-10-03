import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient } from '@/lib/supabase/server';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. RBAC: Requiere permiso atómico 'bitacora:consultar'
  const caller = await requireCallerAuth(req, res, 'bitacora:consultar');
  if (!caller) return;

  const page = Math.max(1, parseInt(typeof req.query.page === 'string' ? req.query.page : '1', 10) || 1);
  const limit = Math.min(100, Math.max(5, parseInt(typeof req.query.limit === 'string' ? req.query.limit : '25', 10) || 25));
  const offset = (page - 1) * limit;

  const modulo = typeof req.query.modulo === 'string' ? req.query.modulo.trim() : null;
  const accion = typeof req.query.accion === 'string' ? req.query.accion.trim() : null;
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : null;
  const fechaDesde = typeof req.query.fecha_desde === 'string' ? req.query.fecha_desde.trim() : null;
  const fechaHasta = typeof req.query.fecha_hasta === 'string' ? req.query.fecha_hasta.trim() : null;

  const supabase = createAdminClient();

  let query = supabase
    .from('bitacora')
    .select('*', { count: 'exact' });

  if (modulo && modulo !== 'TODOS') {
    query = query.eq('modulo', modulo);
  }

  if (accion && accion !== 'TODAS') {
    query = query.eq('accion', accion);
  }

  if (search) {
    query = query.or(`usuario_email.ilike.%${search}%,descripcion.ilike.%${search}%`);
  }

  if (fechaDesde) {
    query = query.gte('created_at', `${fechaDesde}T00:00:00.000Z`);
  }

  if (fechaHasta) {
    query = query.lte('created_at', `${fechaHasta}T23:59:59.999Z`);
  }

  // Orden cronológico descendente (eventos más recientes primero)
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error('Error consultando bitácora de auditoría:', error);
    return res.status(500).json({ error: 'Error al consultar la bitácora de auditoría' });
  }

  const total = count ?? 0;
  const totalPages = Math.ceil(total / limit) || 1;

  return res.status(200).json({
    data: data ?? [],
    pagination: {
      page,
      limit,
      total,
      totalPages,
    },
  });
}
