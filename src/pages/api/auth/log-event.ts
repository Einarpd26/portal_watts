import type { NextApiRequest, NextApiResponse } from 'next';
import { createAdminClient, createServerClientForReqRes } from '@/lib/supabase/server';
import { getPasswordChangeState, isRecoverySession } from '@/utils/passwordChange';
import { registrarBitacora } from '@/lib/bitacora';
import { registrarExitoLogin } from '@/lib/lockout';
import { normalizeRolesArray } from '@/utils/roleUtils';
import { logger } from '@/lib/logger';

// Solo eventos que requieren una sesión válida. INICIO_SESION y LOGIN_FALLIDO los registra
// /api/auth/login en el servidor: aceptarlos aquí permitiría falsificar auditoría y
// resetear o disparar bloqueos de cuentas ajenas.
const ACCIONES_PERMITIDAS = ['CIERRE_SESION', 'RECUPERACION_PASSWORD', 'LOGIN_RECHAZADO'] as const;

type LogAuthBody = {
  accion: (typeof ACCIONES_PERMITIDAS)[number];
  razon?: string;
  detalles?: Record<string, unknown>;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { accion, razon, detalles } = req.body as LogAuthBody;

    if (!accion || !ACCIONES_PERMITIDAS.includes(accion)) {
      return res.status(400).json({ error: 'Acción de autenticación inválida' });
    }

    const supabase = createServerClientForReqRes(req, res);
    const { data: { user } } = await supabase.auth.getUser();

    // Sin sesión no hay identidad confiable: el email nunca se toma del body
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    let idPersona: number | null = null;
    let userEmail = user.email?.toLowerCase() ?? 'desconocido@carameloswatts.com';
    let userRol: string | null = null;

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

    // Procesar restablecimiento de intentos tras recuperación exitosa
    if (accion === 'RECUPERACION_PASSWORD') {
      await registrarExitoLogin(userEmail);

      // Quien recupera su contraseña por correo ya definió una propia: se baja la marca de
      // cambio obligatorio de la temporal vigente. Solo si la sesión nació de la recuperación
      // (amr), no de un login con contraseña: si no, cualquiera con una temporal podría
      // llamar a este endpoint para saltarse el cambio obligatorio. Una temporal vencida
      // no se rehabilita (CU-01 A4.2).
      if (getPasswordChangeState(user.app_metadata) === 'required') {
        const { data: { session } } = await supabase.auth.getSession();
        if (isRecoverySession(session?.access_token)) {
          const { error: clearError } = await createAdminClient().auth.admin.updateUserById(user.id, {
            app_metadata: { must_change_password: false, temp_password_expires_at: null },
          });
          if (clearError) {
            logger.error('Error limpiando el cambio obligatorio tras la recuperación:', clearError);
          }
        }
      }
    }

    let descripcion = '';
    if (accion === 'LOGIN_RECHAZADO') {
      descripcion = 'Inicio de sesión rechazado tras validar el perfil de la cuenta';
    } else if (accion === 'RECUPERACION_PASSWORD') {
      descripcion = 'Contraseña restablecida exitosamente mediante flujo de recuperación';
    } else {
      descripcion = 'Cierre de sesión finalizado por el usuario';
    }

    await registrarBitacora(
      {
        id_persona: idPersona,
        auth_user_id: user.id,
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
