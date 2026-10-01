import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { todayBolivia } from '@/utils/boliviaTime';
import { getPasswordChangeState, TEMP_PASSWORD_EXPIRED } from '@/utils/passwordChange';
import type { AlcanceTipo, RolActivo } from '@/types';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // 1. Validar el método HTTP
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // 2. Inicializar el cliente Supabase para el entorno de servidor (lee las cookies)
    const supabase = createServerClientForReqRes(req, res);

    // 3. Obtener el usuario autenticado (valida el JWT de la cookie contra Supabase)
    const { data: { user }, error } = await supabase.auth.getUser();

    // 4. Si no hay usuario o hay error (ej. token expirado o inválido)
    if (error || !user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // Contraseña temporal vencida: la cuenta no obtiene sesión (el admin debe regenerar el acceso)
    if (getPasswordChangeState(user.app_metadata) === 'expired') {
      return res.status(403).json({ error: 'La contraseña temporal expiró', code: TEMP_PASSWORD_EXPIRED });
    }

    // 5. Fetch del perfil completo (UserSession) cruzando tablas
    const { data: persona, error: dbError } = await supabase
      .from('personas')
      .select(`
        id,
        ci,
        nombres,
        apellidos,
        email,
        fecha_baja,
        usuario_roles (
          alcance_tipo,
          id_sucursal,
          roles (
            codigo,
            permisos
          )
        )
      `)
      .eq('auth_user_id', user.id)
      .single();

    if (dbError || !persona) {
      console.error('Error fetching persona:', dbError);
      return res.status(403).json({ error: 'Usuario sin perfil asignado' });
    }

    // Colaborador dado de baja: su cuenta IAM puede seguir viva (auth.users)
    // aunque ya no tenga vínculo laboral vigente. fecha_baja es la fecha
    // calendario del último día trabajado (agendable) — se compara por día
    // en hora boliviana, nunca por instante UTC, para no cortarle el acceso
    // antes de que termine esa jornada en el huso horario real de operación.
    if (persona.fecha_baja !== null && todayBolivia() > persona.fecha_baja) {
      return res.status(403).json({ error: 'Cuenta dada de baja' });
    }

    // Soporte multi-rol: usuario_roles puede ser array o un solo objeto según la relación
    const rolesArray = Array.isArray(persona.usuario_roles)
      ? persona.usuario_roles
      : persona.usuario_roles ? [persona.usuario_roles] : [];

    // Fusionar todos los permisos (sin duplicados)
    const allPermisos = [...new Set(rolesArray.flatMap(r => r.roles?.permisos ?? []))];

    // Rol primario = el primero en el array (el más recientemente asignado)
    const primaryRole = rolesArray[0];

    const roles: RolActivo[] = rolesArray.map(r => ({
      id_rol: 0, // id_rol no está en el select actual de me.ts; se omite
      codigo: r.roles?.codigo ?? 'SIN_ROL',
      nombre: r.roles?.codigo ?? 'SIN_ROL',
      permisos: r.roles?.permisos ?? [],
      alcance_tipo: r.alcance_tipo as AlcanceTipo,
      id_sucursal: r.id_sucursal,
    }));

    const userSession = {
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

    // 6. Devolver la información del usuario
    return res.status(200).json({ user: userSession });
  } catch (err) {
    console.error('Error en /api/auth/me:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
