// Estado del cambio obligatorio de contraseña, guardado en app_metadata de
// auth.users. app_metadata solo se escribe con service role: el usuario no
// puede limpiar la marca desde el cliente (a diferencia de user_metadata).
//
// Módulo sin dependencias de Node: lo usan el proxy y las API routes.
export type PasswordChangeState = 'none' | 'required' | 'expired';

export function getPasswordChangeState(
  appMetadata: Record<string, unknown> | undefined,
  now = Date.now()
): PasswordChangeState {
  if (appMetadata?.must_change_password !== true) return 'none';

  const expiresAt = appMetadata.temp_password_expires_at;
  if (typeof expiresAt === 'string' && now > Date.parse(expiresAt)) return 'expired';

  return 'required';
}

// Métodos `amr` que GoTrue asigna a una sesión creada al verificar un enlace o código de
// recuperación. Una sesión de login normal lleva `password`.
const RECOVERY_AMR_METHODS = ['recovery', 'otp', 'magiclink'];

/**
 * Indica si el access token proviene de una recuperación de contraseña por correo
 * (enlace o código de 6 dígitos) y no de un login con contraseña. Falla cerrado: ante un
 * token ilegible o sin `amr`, devuelve false. El token debe haberse validado antes con
 * `auth.getUser()`; aquí solo se lee su payload.
 */
export function isRecoverySession(accessToken: string | undefined): boolean {
  if (!accessToken) return false;

  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return false;

    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const { amr } = JSON.parse(json) as { amr?: unknown };
    if (!Array.isArray(amr)) return false;

    const methods = amr.map((entry) =>
      typeof entry === 'string' ? entry : (entry as { method?: unknown })?.method
    );

    return (
      !methods.includes('password') &&
      methods.some((m) => typeof m === 'string' && RECOVERY_AMR_METHODS.includes(m))
    );
  } catch {
    return false;
  }
}

// Códigos que devuelven las API routes mientras el cambio esté pendiente
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';
export const TEMP_PASSWORD_EXPIRED = 'TEMP_PASSWORD_EXPIRED';
