import type { NextApiRequest, NextApiResponse } from 'next';
import { createServerClientForReqRes } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';
import {
  ipExcedioLimiteDeFallos,
  registrarFalloLogin,
  registrarExitoLogin,
  verificarBloqueoCuenta,
} from '@/lib/lockout';
import { validateLoginForm } from '@/utils/authValidation';
import { getClientIp } from '@/utils/bitacoraUtils';
import { logger } from '@/lib/logger';
import { procesarLogin, type LoginResponse } from '@/utils/loginFlow';

export type { LoginResponse };

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
    const supabase = createServerClientForReqRes(req, res);

    const outcome = await procesarLogin(
      {
        verificarBloqueo: verificarBloqueoCuenta,
        ipExcedioLimite: ipExcedioLimiteDeFallos,
        // Escribe las cookies de sesión en la respuesta
        iniciarSesion: async (correo, clave) => {
          const { data, error } = await supabase.auth.signInWithPassword({ email: correo, password: clave });
          return {
            userId: error || !data.user ? null : data.user.id,
            errorCode: error?.code ?? null,
            errorMessage: error?.message ?? null,
          };
        },
        registrarFallo: (correo, direccion) => registrarFalloLogin(correo, direccion, req),
        registrarExito: registrarExitoLogin,
        auditarInicio: async (userId, correo) => {
          await registrarBitacora(
            {
              auth_user_id: userId,
              usuario_email: correo,
              modulo: 'AUTENTICACION',
              accion: 'INICIO_SESION',
              descripcion: 'Inicio de sesión exitoso en el portal',
            },
            req
          );
        },
      },
      cleanEmail,
      password,
      ip
    );

    return res.status(outcome.status).json(outcome.body);
  } catch (err: unknown) {
    logger.error('Error en /api/auth/login:', err);
    return res.status(500).json({ error: 'Ocurrió un error inesperado al iniciar sesión.' });
  }
}
