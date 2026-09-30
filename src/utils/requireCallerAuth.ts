import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { todayBolivia } from '@/utils/boliviaTime';
import type { AlcanceTipo, RolActivo, UserSession } from '@/types';

export async function requireCallerAuth(
  req: NextApiRequest,
  res: NextApiResponse,
  requiredPermission?: string
): Promise<UserSession | null> {
  const supabase = createServerClientForReqRes(req, res);
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    res.status(401).json({ error: 'No autenticado' });
    return null;
  }

  const { data: persona } = await supabase
    .from('personas')
    .select(`
      id, ci, nombres, apellidos, email, fecha_baja,
      usuario_roles (
        id_rol, alcance_tipo, id_sucursal,
        roles ( id, codigo, nombre, permisos )
      )
    `)
    .eq('auth_user_id', user.id)
    .single();

  if (!persona) {
    res.status(403).json({ error: 'Sin perfil asignado' });
    return null;
  }

  if (persona.fecha_baja !== null && todayBolivia() > persona.fecha_baja) {
    res.status(403).json({ error: 'Cuenta dada de baja' });
    return null;
  }

  const rolesArray = Array.isArray(persona.usuario_roles)
    ? persona.usuario_roles
    : persona.usuario_roles ? [persona.usuario_roles] : [];

  const allPermisos = [...new Set(rolesArray.flatMap(r => r.roles?.permisos ?? []))];
  const primaryRole = rolesArray[0];

  const roles: RolActivo[] = rolesArray.map(r => ({
    id_rol: r.id_rol,
    codigo: r.roles?.codigo ?? 'SIN_ROL',
    nombre: r.roles?.nombre ?? 'Sin Rol',
    permisos: r.roles?.permisos ?? [],
    alcance_tipo: r.alcance_tipo as AlcanceTipo,
    id_sucursal: r.id_sucursal,
  }));

  const session: UserSession = {
    id_persona: persona.id,
    ci: persona.ci,
    nombres: persona.nombres,
    apellidos: persona.apellidos,
    email: persona.email || user.email || '',
    rol_codigo: primaryRole?.roles?.codigo ?? 'SIN_ROL',
    alcance_tipo: (primaryRole?.alcance_tipo ?? 'SUCURSAL') as AlcanceTipo,
    id_sucursal: primaryRole?.id_sucursal ?? null,
    permisos: allPermisos,
    roles,
  };

  if (requiredPermission && !allPermisos.includes(requiredPermission)) {
    res.status(403).json({ error: 'Sin permiso suficiente' });
    return null;
  }

  return session;
}
