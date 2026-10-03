import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';
import { registrarFalloLogin, registrarExitoLogin } from '@/lib/lockout';
import { normalizeRolesArray } from '@/utils/roleUtils';
import { logger } from '@/lib/logger';

type LogAuthBody = {
  accion: 'INICIO_SESION' | 'CIERRE_SESION' | 'LOGIN_FALLIDO' | 'RECUPERACION_PASSWORD';
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

    if (!accion || !['INICIO_SESION', 'CIERRE_SESION', 'LOGIN_FALLIDO', 'RECUPERACION_PASSWORD'].includes(accion)) {
      return res.status(400).json({ error: 'Acción de autenticación inválida' });
    }

    const supabase = createServerClientForReqRes(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    let idPersona: number | null = null;
    let userEmail = (email?.trim().toLowerCase()) || (user?.email?.toLowerCase()) || 'desconocido@carameloswatts.com';
    let userRol: string | null = null;

    if (user) {
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
        const rolesArray = normalizeRolesArray(persona.usuario_roles);
        userRol = rolesArray[0]?.roles?.codigo ?? null;
      }
    }

    // Procesar política de intentos fallidos y restablecimiento de login
    if (accion === 'LOGIN_FALLIDO') {
      const { evaluation, mensaje } = await registrarFalloLogin(userEmail, req);
      return res.status(200).json({
        success: true,
        lockout: evaluation,
        mensaje,
      });
    }

    if (accion === 'INICIO_SESION' || accion === 'RECUPERACION_PASSWORD') {
      // Login o restablecimiento exitoso: restablece contadores de intentos fallidos
      await registrarExitoLogin(userEmail);
    }

    let descripcion = '';
    if (accion === 'INICIO_SESION') {
      descripcion = 'Inicio de sesión exitoso en el portal';
    } else if (accion === 'RECUPERACION_PASSWORD') {
      descripcion = 'Contraseña restablecida exitosamente mediante flujo de recuperación';
    } else {
      descripcion = 'Cierre de sesión finalizado por el usuario';
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
    logger.error('Error registrando evento de autenticación en bitácora:', err);
    return res.status(500).json({ error: 'Error al registrar evento de auditoría' });
  }
}
