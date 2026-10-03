import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';

type LogAuthBody = {
  accion: 'INICIO_SESION' | 'CIERRE_SESION' | 'LOGIN_FALLIDO';
  email?: string;
  razon?: string;
  detalles?: Record<string, unknown>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accion, email, razon, detalles } = req.body as LogAuthBody;

    if (!accion || !['INICIO_SESION', 'CIERRE_SESION', 'LOGIN_FALLIDO'].includes(accion)) {
      return res.status(400).json({ error: 'Acción de autenticación inválida' });
    }

    const supabase = createServerClientForReqRes(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    let idPersona: number | null = null;
    let userEmail = (email?.trim().toLowerCase()) || (user?.email?.toLowerCase()) || 'desconocido@carameloswatts.com';
    let userRol: string | null = null;

    if (user) {
      // Si el usuario está autenticado en Supabase, buscamos su perfil y rol
      const { data: persona } = await supabase
        .from('personas')
        .select(`
          id, email,
          usuario_roles (
            roles ( codigo )
          )
        `)
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (persona) {
        idPersona = persona.id;
        userEmail = persona.email || user.email || userEmail;
        const rolesArray = Array.isArray(persona.usuario_roles)
          ? persona.usuario_roles
          : persona.usuario_roles ? [persona.usuario_roles] : [];
        userRol = rolesArray[0]?.roles?.codigo ?? null;
      }
    }

    let descripcion = '';
    if (accion === 'INICIO_SESION') {
      descripcion = 'Inicio de sesión exitoso en el portal';
    } else if (accion === 'CIERRE_SESION') {
      descripcion = 'Cierre de sesión finalizado por el usuario';
    } else {
      descripcion = razon
        ? `Intento fallido de inicio de sesión: ${razon}`
        : 'Intento fallido de inicio de sesión con credenciales inválidas';
    }

    await registrarBitacora(
      {
        id_persona: idPersona,
        auth_user_id: user?.id ?? null,
        usuario_email: userEmail,
        usuario_rol: userRol,
        modulo: 'AUTENTICACION',
        accion,
        descripcion,
        detalles_json: detalles ?? (razon ? { razon } : null),
      },
      req
    );

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('Error registrando evento de autenticación en bitácora:', err);
    return res.status(500).json({ error: 'Error al registrar evento de auditoría' });
  }
}
