import type { NextApiRequest, NextApiResponse } from 'next';
import { requireCallerAuth } from '@/utils/requireCallerAuth';
import { createAdminClient, createServerClientForReqRes } from '@/lib/supabase/server';
import { evaluarEstadoBloqueo } from '@/utils/lockoutUtils';
import { normalizeRolesArray } from '@/utils/roleUtils';
import { logger } from '@/lib/logger';
import type { AlcanceTipo, RolActivo, UsuarioActivo } from '@/types';

type RoleRelation = { id: number; codigo: string; nombre: string; permisos: string[] } | null;

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
  // (sin esto el listado quedaría sin filtrar y mostraría todas las cuentas)
  const idSucursalAlcance = caller.alcance_tipo === 'SUCURSAL' ? caller.id_sucursal : undefined;
  if (idSucursalAlcance === null) {
    return res.status(403).json({ error: 'Sin sucursal asignada' });
  }

  try {
    const supabase = createServerClientForReqRes(req, res);

    const { data, error } = await supabase
      .from('personas')
      .select(`
        id, ci, nombres, apellidos, email, auth_user_id,
        usuario_roles (
          id_rol, alcance_tipo, id_sucursal,
          roles ( id, codigo, nombre, permisos )
        )
      `)
      .not('auth_user_id', 'is', null)
      .is('fecha_baja', null);

    if (error) {
      logger.error('Error fetching active users:', error);
      return res.status(500).json({ error: 'Error al obtener usuarios activos' });
    }

    let rows = data ?? [];

    // FISCALIZADOR solo ve usuarios de su propia sucursal
    if (idSucursalAlcance !== undefined) {
      rows = rows.filter((p) => {
        const ur = normalizeRolesArray(p.usuario_roles);
        return ur.some((r) => r.id_sucursal === idSucursalAlcance);
      });
    }

    const emails = rows.map((p) => p.email?.trim().toLowerCase()).filter(Boolean) as string[];
    // intentos_login solo es accesible con service role (sin privilegios para authenticated)
    const { data: intentosData } = emails.length > 0
      ? await createAdminClient()
          .from('intentos_login')
          .select('email, intentos_fallidos, bloqueos_acumulados, bloqueado_hasta, es_permanente')
          .in('email', emails)
      : { data: [] };

    // Hay una fila por (email, ip): se muestra el estado más grave de cada cuenta
    const peso = (i: { es_permanente: boolean; bloqueado_hasta: string | null; intentos_fallidos: number }) =>
      i.es_permanente ? 3 : i.bloqueado_hasta && new Date(i.bloqueado_hasta) > new Date() ? 2 : i.intentos_fallidos > 0 ? 1 : 0;
    const intentosMap = new Map<string, NonNullable<typeof intentosData>[number]>();
    for (const i of intentosData ?? []) {
      const key = i.email.toLowerCase();
      const actual = intentosMap.get(key);
      if (!actual || peso(i) > peso(actual)) intentosMap.set(key, i);
    }
    const now = new Date();

    const users: UsuarioActivo[] = rows.map((p) => {
      const urArray = normalizeRolesArray(p.usuario_roles);

      const roles: RolActivo[] = urArray.map((r) => {
        const rolRel = r.roles as RoleRelation;
        return {
          id_rol: r.id_rol,
          codigo: rolRel?.codigo ?? 'SIN_ROL',
          nombre: rolRel?.nombre ?? 'Sin Rol',
          permisos: rolRel?.permisos ?? [],
          alcance_tipo: r.alcance_tipo as AlcanceTipo,
          id_sucursal: r.id_sucursal,
        };
      });

      const record = p.email ? intentosMap.get(p.email.toLowerCase()) : null;
      const lockoutEval = evaluarEstadoBloqueo(record, now);

      return {
        id_persona: p.id,
        ci: p.ci,
        nombres: p.nombres,
        apellidos: p.apellidos,
        auth_user_id: p.auth_user_id as string,
        email: p.email,
        roles,
        bloqueado: lockoutEval.bloqueado,
        bloqueo_mensaje: lockoutEval.bloqueado ? lockoutEval.mensaje : undefined,
        es_permanente: lockoutEval.estado === 'BLOQUEO_PERMANENTE',
      };
    });

    return res.status(200).json({ users });
  } catch (err) {
    logger.error('Error en /api/admin/active-users:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
