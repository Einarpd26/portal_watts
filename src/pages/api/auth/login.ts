import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';
import { registrarFalloLogin, registrarExitoLogin, verificarBloqueoCuenta } from '@/lib/lockout';
import { validateLoginForm } from '@/utils/authValidation';
import { getClientIp } from '@/utils/bitacoraUtils';
import { logger } from '@/lib/logger';
import type { LockoutEvaluation } from '@/utils/lockoutUtils';

export type LoginResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  lockout?: LockoutEvaluation;
};

// Solo estos códigos de GoTrue cuentan como intento fallido de contraseña.
const CREDENTIAL_ERROR_CODES = ['invalid_credentials', 'invalid_grant'];

/**
 * Inicio de sesión del lado servidor (CU-01).
 * El bloqueo es por par (email, ip). La verificación de bloqueo, la contraseña y el conteo de intentos ocurren aquí,
 * de modo que el navegador no decide nada: no puede omitir el chequeo ni
 * resetear contadores. El email del intento es el del body, pero solo se
 * confirma como "éxito" tras validar la contraseña contra Supabase Auth.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse<LoginResponse>) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };
  if (typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Correo y contraseña son requeridos.' });
  }

  const validation = validateLoginForm(email, password);
  if (!validation.isValid) {
    return res.status(400).json({ error: 'Credenciales con formato inválido.' });
  }
  const cleanEmail = validation.trimmedEmail.toLowerCase();
  const ip = getClientIp(req);

  try {
    // 1. Bloqueo vigente: se rechaza ANTES de verificar la contraseña
    const estado = await verificarBloqueoCuenta(cleanEmail, ip);
    if (estado.bloqueado) {
      return res.status(423).json({
        error: estado.mensaje ?? 'Cuenta bloqueada.',
        code: 'account_locked',
        lockout: estado,
      });
    }

    // 2. Verificación de credenciales (escribe las cookies de sesión en la respuesta)
    const supabase = createServerClientForReqRes(req, res);
    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });

    if (authError || !data.user) {
      const code = authError?.code ?? 'unknown';

      if (CREDENTIAL_ERROR_CODES.includes(code)) {
        const { evaluation, mensaje } = await registrarFalloLogin(cleanEmail, ip, req);
        return res.status(evaluation.bloqueado ? 423 : 401).json({
          error: mensaje,
          code: evaluation.bloqueado ? 'account_locked' : 'invalid_credentials',
          lockout: evaluation,
        });
      }

      return res.status(401).json({ error: authError?.message ?? 'No fue posible iniciar sesión.', code });
    }

    // 3. Éxito real: reinicia contadores y audita
    await registrarExitoLogin(cleanEmail, ip);
    await registrarBitacora(
      {
        auth_user_id: data.user.id,
        usuario_email: cleanEmail,
        modulo: 'AUTENTICACION',
        accion: 'INICIO_SESION',
        descripcion: 'Inicio de sesión exitoso en el portal',
      },
      req
    );

    return res.status(200).json({ success: true });
  } catch (err: unknown) {
    logger.error('Error en /api/auth/login:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado al iniciar sesión.' });
  }
}
