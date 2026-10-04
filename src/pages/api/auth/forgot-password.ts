import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';
import { logger } from '@/lib/logger';

export type ForgotPasswordResponse = {
  success?: boolean;
  error?: string;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<ForgotPasswordResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email } = req.body as { email?: string };
  const normalizedEmail = email?.trim().toLowerCase();

  if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
    return res.status(400).json({ error: 'Ingresa un formato de correo electrónico válido.' });
  }

  try {
    const supabaseAdmin = createAdminClient();

    // 1. Verificar si la persona existe y su estado laboral
    const { data: persona, error: personaError } = await supabaseAdmin
      .from('personas')
      .select('id, email, fecha_baja')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (personaError) {
      logger.error('[forgot-password] Error consultando persona:', personaError);
      return res.status(500).json({ error: 'Error al verificar la cuenta de usuario.' });
    }

    // Respuesta indistinguible (OWASP antienumeración):
    // Si no existe o tiene fecha_baja respondemos success: true para no filtrar existencia
    // de cuentas. El estado de bloqueo de login NO impide recuperar: es la vía de escape
    // del titular cuando alguien le provocó fallos a propósito.
    if (!persona || persona.fecha_baja !== null) {
      return res.status(200).json({ success: true });
    }

    // 3. Determinar la URL de redirección
    const host = req.headers.host || '127.0.0.1:3000';
    const proto = req.headers['x-forwarded-proto'] || 'http';
    const currentOrigin = req.headers.origin || `${proto}://${host}`;
    const siteUrl =
      currentOrigin ||
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://127.0.0.1:3000';

    const { error: resetError } = await supabaseAdmin.auth.resetPasswordForEmail(
      normalizedEmail,
      {
        redirectTo: `${siteUrl.replace(/\/$/, '')}/auth/reset-password`,
      }
    );

    if (resetError) {
      if (resetError.message.toLowerCase().includes('rate limit')) {
        return res
          .status(429)
          .json({ error: 'Demasiadas solicitudes enviadas. Por favor intenta de nuevo en unos minutos.' });
      }
      logger.error('[forgot-password] Error en resetPasswordForEmail:', resetError);
      return res.status(500).json({ error: 'No se pudo procesar la solicitud de recuperación.' });
    }

    // 4. Registrar auditoría en bitácora (UTC 0)
    await registrarBitacora(
      {
        id_persona: persona.id,
        auth_user_id: null,
        usuario_email: normalizedEmail,
        usuario_rol: null,
        modulo: 'AUTENTICACION',
        accion: 'SOLICITUD_RECUPERACION_PASSWORD',
        descripcion: `Solicitud de recuperación de contraseña generada para ${normalizedEmail}`,
        detalles_json: { email: normalizedEmail },
      },
      req
    );

    return res.status(200).json({ success: true });
  } catch (error: unknown) {
    logger.error('[forgot-password] Excepción no controlada:', error);
    return res.status(500).json({ error: 'Ocurrió un error inesperado al procesar la solicitud.' });
  }
}
