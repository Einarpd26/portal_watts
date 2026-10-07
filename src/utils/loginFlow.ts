import type { LockoutEvaluation } from './lockoutUtils';

// Orden y decisiones del inicio de sesión (CU-01), separados de HTTP y de Supabase para poder
// probarlos con dobles. /api/auth/login solo cablea las dependencias reales.

export type LoginResponse = {
  success?: boolean;
  error?: string;
  code?: string;
  lockout?: LockoutEvaluation;
};

export interface LoginOutcome {
  status: number;
  body: LoginResponse;
}

export interface SignInResult {
  /** null si la autenticación falló (error del proveedor o respuesta sin usuario) */
  userId: string | null;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface LoginDeps {
  verificarBloqueo: (email: string, ip: string) => Promise<LockoutEvaluation>;
  ipExcedioLimite: (ip: string) => Promise<boolean>;
  iniciarSesion: (email: string, password: string) => Promise<SignInResult>;
  registrarFallo: (
    email: string,
    ip: string
  ) => Promise<{ evaluation: LockoutEvaluation; mensaje: string }>;
  registrarExito: (email: string, ip: string) => Promise<void>;
  auditarInicio: (userId: string, email: string) => Promise<void>;
}

// Solo estos códigos del proveedor cuentan como intento fallido de contraseña.
export const CREDENTIAL_ERROR_CODES = ['invalid_credentials', 'invalid_grant'];

export async function procesarLogin(
  deps: LoginDeps,
  email: string,
  password: string,
  ip: string
): Promise<LoginOutcome> {
  // 1. Bloqueo vigente: se rechaza ANTES de verificar la contraseña
  const estado = await deps.verificarBloqueo(email, ip);
  if (estado.bloqueado) {
    return {
      status: 423,
      body: { error: estado.mensaje ?? 'Cuenta bloqueada.', code: 'account_locked', lockout: estado },
    };
  }

  // 1b. Tope por IP: protege el presupuesto compartido de Supabase Auth
  if (await deps.ipExcedioLimite(ip)) {
    return {
      status: 429,
      body: {
        error: 'Demasiados intentos fallidos desde esta red. Espera unos minutos e inténtalo de nuevo.',
        code: 'ip_rate_limited',
      },
    };
  }

  // 2. Verificación de credenciales
  const resultado = await deps.iniciarSesion(email, password);

  if (resultado.userId === null) {
    const code = resultado.errorCode ?? 'unknown';

    if (CREDENTIAL_ERROR_CODES.includes(code)) {
      const { evaluation, mensaje } = await deps.registrarFallo(email, ip);
      return {
        status: evaluation.bloqueado ? 423 : 401,
        body: {
          error: mensaje,
          code: evaluation.bloqueado ? 'account_locked' : 'invalid_credentials',
          lockout: evaluation,
        },
      };
    }

    return {
      status: 401,
      body: { error: resultado.errorMessage ?? 'No fue posible iniciar sesión.', code },
    };
  }

  // 3. Éxito real: reinicia contadores y audita
  await deps.registrarExito(email, ip);
  await deps.auditarInicio(resultado.userId, email);
  return { status: 200, body: { success: true } };
}
