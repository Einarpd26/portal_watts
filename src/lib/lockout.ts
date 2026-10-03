import type { NextApiRequest } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { registrarBitacora } from '@/lib/bitacora';
import { logger } from '@/lib/logger';
import {
  evaluarEstadoBloqueo,
  calcularEscalamientoBloqueo,
  generarMensajeIntentoFallido,
  type LockoutEvaluation,
} from '@/utils/lockoutUtils';
import type { UserSession } from '@/types';

/**
 * Consulta el estado actual de bloqueo de una cuenta en base a su email.
 */
export async function verificarBloqueoCuenta(email: string): Promise<LockoutEvaluation> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) {
    return {
      bloqueado: false,
      estado: 'LIBRE',
      intentosFallidos: 0,
      intentosRestantes: 3,
    };
  }

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from('intentos_login')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (error) {
      logger.error('Error verificando bloqueo de cuenta:', error);
      return {
        bloqueado: false,
        estado: 'LIBRE',
        intentosFallidos: 0,
        intentosRestantes: 3,
      };
    }

    return evaluarEstadoBloqueo(data, new Date());
  } catch (err: unknown) {
    logger.error('Excepción consultando estado de bloqueo:', err);
    return {
      bloqueado: false,
      estado: 'LIBRE',
      intentosFallidos: 0,
      intentosRestantes: 3,
    };
  }
}

/**
 * Registra un intento fallido de autenticación.
 * Aplica la política escalonada de 3 intentos:
 * 1er ciclo: 15 min | 2do ciclo: 1 hora | 3er ciclo: permanente.
 * Registra todos los eventos en la bitácora en UTC 0.
 */
export async function registrarFalloLogin(
  email: string,
  req?: NextApiRequest
): Promise<{ evaluation: LockoutEvaluation; mensaje: string }> {
  const cleanEmail = email.trim().toLowerCase();
  const supabase = createAdminClient();
  const now = new Date();
  const nowIso = now.toISOString();

  try {
    const { data: record, error: fetchErr } = await supabase
      .from('intentos_login')
      .select('*')
      .eq('email', cleanEmail)
      .maybeSingle();

    if (fetchErr) {
      logger.error('Error obteniendo registro de intentos:', fetchErr);
    }

    // Si ya tiene un bloqueo permanente, no hacemos nada más
    if (record?.es_permanente) {
      const evaluation = evaluarEstadoBloqueo(record, now);
      return { evaluation, mensaje: evaluation.mensaje ?? 'Cuenta bloqueada permanentemente.' };
    }

    // Evaluar si tenía un bloqueo temporal que ya expiró
    const bloqueoExpirado =
      record?.bloqueado_hasta && new Date(record.bloqueado_hasta).getTime() <= now.getTime();

    // Determinar los intentos fallidos acumulados en este ciclo
    const intentosPrevios = bloqueoExpirado ? 0 : record?.intentos_fallidos || 0;
    const nuevosFallidos = intentosPrevios + 1;
    const bloqueosAcumulados = record?.bloqueos_acumulados || 0;

    // Caso A: Todavía no llega a 3 fallos en este ciclo
    if (nuevosFallidos < 3) {
      const mensaje = generarMensajeIntentoFallido(nuevosFallidos);

      await supabase.from('intentos_login').upsert(
        {
          email: cleanEmail,
          intentos_fallidos: nuevosFallidos,
          bloqueos_acumulados: bloqueosAcumulados,
          bloqueado_hasta: null,
          es_permanente: false,
          ultimo_intento: nowIso,
        },
        { onConflict: 'email' }
      );

      await registrarBitacora(
        {
          usuario_email: cleanEmail,
          modulo: 'AUTENTICACION',
          accion: 'LOGIN_FALLIDO',
          descripcion: `Intento fallido de login (${nuevosFallidos}/3 del ciclo actual)`,
          detalles_json: { intento: nuevosFallidos, maxIntentos: 3, ciclo: bloqueosAcumulados + 1 },
        },
        req
      );

      return {
        evaluation: {
          bloqueado: false,
          estado: 'LIBRE',
          intentosFallidos: nuevosFallidos,
          intentosRestantes: 3 - nuevosFallidos,
        },
        mensaje,
      };
    }

    // Caso B: Alcanzó los 3 fallos consecutivos -> Escalamiento de bloqueo
    const escalamiento = calcularEscalamientoBloqueo(bloqueosAcumulados, now);

    await supabase.from('intentos_login').upsert(
      {
        email: cleanEmail,
        intentos_fallidos: 3,
        bloqueos_acumulados: escalamiento.nuevoNivelBloqueo,
        bloqueado_hasta: escalamiento.bloqueadoHasta,
        es_permanente: escalamiento.esPermanente,
        ultimo_intento: nowIso,
      },
      { onConflict: 'email' }
    );

    // Registrar evento de seguridad en bitácora (UTC 0)
    await registrarBitacora(
      {
        usuario_email: cleanEmail,
        modulo: 'AUTENTICACION',
        accion: escalamiento.accionBitacora,
        descripcion: escalamiento.mensaje,
        detalles_json: {
          nivel_bloqueo: escalamiento.nuevoNivelBloqueo,
          duracion_minutos: escalamiento.duracionMinutos,
          es_permanente: escalamiento.esPermanente,
          desbloquea_utc: escalamiento.bloqueadoHasta,
        },
      },
      req
    );

    const evaluation: LockoutEvaluation = escalamiento.esPermanente
      ? {
          bloqueado: true,
          estado: 'BLOQUEO_PERMANENTE',
          mensaje: escalamiento.mensaje,
        }
      : {
          bloqueado: true,
          estado: 'BLOQUEO_TEMPORAL',
          minutosRestantes: escalamiento.duracionMinutos || 15,
          nivelBloqueo: escalamiento.nuevoNivelBloqueo,
          desbloqueaEnUtc: escalamiento.bloqueadoHasta || nowIso,
          mensaje: escalamiento.mensaje,
        };

    return { evaluation, mensaje: escalamiento.mensaje };
  } catch (err: unknown) {
    logger.error('Error al registrar fallo de login:', err);
    return {
      evaluation: {
        bloqueado: false,
        estado: 'LIBRE',
        intentosFallidos: 1,
        intentosRestantes: 2,
      },
      mensaje: 'Correo o contraseña incorrectos.',
    };
  }
}

/**
 * Restablece los intentos fallidos tras un inicio de sesión exitoso.
 */
export async function registrarExitoLogin(email: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;

  try {
    const supabase = createAdminClient();
    await supabase
      .from('intentos_login')
      .update({
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        bloqueos_acumulados: 0,
        es_permanente: false,
        ultimo_intento: new Date().toISOString(),
      })
      .eq('email', cleanEmail);
  } catch (err: unknown) {
    logger.error('Error restableciendo intentos tras login exitoso:', err);
  }
}

/**
 * Desbloqueo administrativo manual de una cuenta bloqueada (temporal o permanente).
 */
export async function desbloquearCuentaAdmin(
  email: string,
  adminSession: UserSession,
  req?: NextApiRequest
): Promise<boolean> {
  const cleanEmail = email.trim().toLowerCase();
  const supabase = createAdminClient();
  const nowIso = new Date().toISOString();

  try {
    const { error } = await supabase
      .from('intentos_login')
      .upsert({
        email: cleanEmail,
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        bloqueos_acumulados: 0,
        es_permanente: false,
        ultimo_desbloqueo: nowIso,
        desbloqueado_por: adminSession.email,
        ultimo_intento: nowIso,
      }, { onConflict: 'email' });

    if (error) {
      logger.error('Error desbloqueando cuenta en base de datos:', error);
      return false;
    }

    await registrarBitacora(
      {
        id_persona: adminSession.id_persona,
        usuario_email: adminSession.email,
        usuario_rol: adminSession.rol_codigo,
        modulo: 'ACCESOS',
        accion: 'DESBLOQUEO_CUENTA',
        descripcion: `Cuenta ${cleanEmail} desbloqueada manualmente por el administrador ${adminSession.email}`,
        detalles_json: {
          cuenta_desbloqueada: cleanEmail,
          desbloqueado_por: adminSession.email,
        },
      },
      req
    );

    return true;
  } catch (err: unknown) {
    logger.error('Excepción desbloqueando cuenta administrativa:', err);
    return false;
  }
}
