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

// Cantidad de IPs distintas con fallos recientes para un mismo correo que se considera
// un ataque distribuido (no se bloquea la cuenta, solo se alerta en bitácora).
const UMBRAL_ATAQUE_DISTRIBUIDO = 3;
const VENTANA_ATAQUE_DISTRIBUIDO_MS = 60 * 60 * 1000;

// Tope de fallos por IP (sumando todos los correos) en una ventana corta. El login
// llama a Supabase Auth desde el servidor, y su rate limit por IP (`sign_in_sign_ups`,
// 30 cada 5 min) se comparte entre todos los usuarios: sin este tope, quien pruebe
// correos distintos desde nuestra API agotaría ese presupuesto y dejaría sin login a todos.
// Se mantiene por debajo de ese límite para que una sola IP no pueda agotarlo sola.
export const LIMITE_FALLOS_POR_IP = 15;
export const VENTANA_LIMITE_IP_MS = 5 * 60 * 1000;

/**
 * Indica si una IP superó el tope de fallos recientes (sin importar el correo).
 * Ante un error de consulta no bloquea: el bloqueo por par sigue vigente.
 */
export async function ipExcedioLimiteDeFallos(ip: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const desde = new Date(Date.now() - VENTANA_LIMITE_IP_MS).toISOString();
    const { data, error } = await supabase
      .from('intentos_login')
      .select('intentos_fallidos')
      .eq('ip', ip)
      .gte('ultimo_intento', desde);

    if (error) {
      logger.error('Error consultando el tope de fallos por IP:', error);
      return false;
    }

    const total = (data ?? []).reduce((acc, r) => acc + r.intentos_fallidos, 0);
    return total >= LIMITE_FALLOS_POR_IP;
  } catch (err: unknown) {
    logger.error('Excepción consultando el tope de fallos por IP:', err);
    return false;
  }
}

/**
 * Consulta el estado de bloqueo del par (email, ip).
 * El bloqueo es por par: quien provoca fallos se bloquea a sí mismo, no al titular
 * de la cuenta, que sigue pudiendo entrar desde otra IP.
 */
export async function verificarBloqueoCuenta(email: string, ip: string): Promise<LockoutEvaluation> {
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
      .eq('ip', ip)
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
 * Registra un intento fallido de autenticación del par (email, ip).
 * Aplica la política escalonada de 3 intentos:
 * 1er ciclo: 15 min | 2do ciclo: 1 hora | 3er ciclo: permanente (para ese par).
 * Registra todos los eventos en la bitácora en UTC 0.
 */
export async function registrarFalloLogin(
  email: string,
  ip: string,
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
      .eq('ip', ip)
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
          ip,
          intentos_fallidos: nuevosFallidos,
          bloqueos_acumulados: bloqueosAcumulados,
          bloqueado_hasta: null,
          es_permanente: false,
          ultimo_intento: nowIso,
        },
        { onConflict: 'email,ip' }
      );

      await registrarBitacora(
        {
          usuario_email: cleanEmail,
          modulo: 'AUTENTICACION',
          accion: 'LOGIN_FALLIDO',
          descripcion: `Intento fallido de login (${nuevosFallidos}/3 del ciclo actual)`,
          detalles_json: { intento: nuevosFallidos, maxIntentos: 3, ciclo: bloqueosAcumulados + 1, ip },
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
        ip,
        intentos_fallidos: 3,
        bloqueos_acumulados: escalamiento.nuevoNivelBloqueo,
        bloqueado_hasta: escalamiento.bloqueadoHasta,
        es_permanente: escalamiento.esPermanente,
        ultimo_intento: nowIso,
      },
      { onConflict: 'email,ip' }
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
          ip,
        },
      },
      req
    );

    await alertarAtaqueDistribuido(cleanEmail, now, req);

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
 * Alerta en bitácora si un mismo correo recibe fallos desde varias IPs distintas en
 * poco tiempo (fuerza bruta distribuida). No bloquea la cuenta: hacerlo reabriría el
 * sabotaje por bloqueo ajeno; el administrador decide con la evidencia.
 */
async function alertarAtaqueDistribuido(
  email: string,
  now: Date,
  req?: NextApiRequest
): Promise<void> {
  try {
    const supabase = createAdminClient();
    const desde = new Date(now.getTime() - VENTANA_ATAQUE_DISTRIBUIDO_MS).toISOString();
    const { data } = await supabase
      .from('intentos_login')
      .select('ip')
      .eq('email', email)
      .gte('ultimo_intento', desde);

    const ips = [...new Set((data ?? []).map((r) => r.ip))];
    if (ips.length < UMBRAL_ATAQUE_DISTRIBUIDO) return;

    await registrarBitacora(
      {
        usuario_email: email,
        modulo: 'AUTENTICACION',
        accion: 'ALERTA_ATAQUE_DISTRIBUIDO',
        descripcion: `Fallos de login sobre ${email} desde ${ips.length} IPs distintas en la última hora`,
        detalles_json: { ips },
      },
      req
    );
  } catch (err: unknown) {
    logger.error('Error evaluando ataque distribuido:', err);
  }
}

/**
 * Restablece los intentos fallidos tras una autenticación válida.
 * Con `ip` limpia solo ese par (login exitoso); sin `ip` limpia todos los pares del
 * correo (recuperación de contraseña: el titular demostró control del buzón).
 */
export async function registrarExitoLogin(email: string, ip?: string): Promise<void> {
  const cleanEmail = email.trim().toLowerCase();
  if (!cleanEmail) return;

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from('intentos_login')
      .update({
        intentos_fallidos: 0,
        bloqueado_hasta: null,
        bloqueos_acumulados: 0,
        es_permanente: false,
        ultimo_intento: new Date().toISOString(),
      })
      .eq('email', cleanEmail);
    if (ip) query = query.eq('ip', ip);
    await query;
  } catch (err: unknown) {
    logger.error('Error restableciendo intentos tras login exitoso:', err);
  }
}

/**
 * Desbloqueo administrativo manual: limpia todos los pares (email, ip) de la cuenta.
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
      }, { onConflict: 'email,ip' });

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
