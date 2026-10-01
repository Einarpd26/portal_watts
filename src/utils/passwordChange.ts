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

// Códigos que devuelven las API routes mientras el cambio esté pendiente
export const PASSWORD_CHANGE_REQUIRED = 'PASSWORD_CHANGE_REQUIRED';
export const TEMP_PASSWORD_EXPIRED = 'TEMP_PASSWORD_EXPIRED';
