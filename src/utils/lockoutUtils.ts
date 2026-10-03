export interface IntentosLoginRecord {
  email: string;
  intentos_fallidos: number;
  bloqueos_acumulados: number;
  bloqueado_hasta: string | null;
  es_permanente: boolean;
  ultimo_intento?: string;
  ultimo_desbloqueo?: string | null;
  desbloqueado_por?: string | null;
}

export type LockoutEvaluation =
  | {
      bloqueado: false;
      estado: 'LIBRE';
      intentosFallidos: number;
      intentosRestantes: number;
      mensaje?: string;
    }
  | {
      bloqueado: true;
      estado: 'BLOQUEO_TEMPORAL';
      minutosRestantes: number;
      nivelBloqueo: number;
      desbloqueaEnUtc: string;
      mensaje: string;
    }
  | {
      bloqueado: true;
      estado: 'BLOQUEO_PERMANENTE';
      mensaje: string;
    };

export interface EscalationResult {
  bloqueadoHasta: string | null;
  esPermanente: boolean;
  nuevoNivelBloqueo: number;
  duracionMinutos: number | null;
  accionBitacora: string;
  mensaje: string;
}

/**
 * Evalúa el estado de bloqueo de una cuenta frente a un instante de tiempo (UTC 0 por defecto).
 */
export function evaluarEstadoBloqueo(
  registro: IntentosLoginRecord | null | undefined,
  nowUtc: Date = new Date()
): LockoutEvaluation {
  if (!registro) {
    return {
      bloqueado: false,
      estado: 'LIBRE',
      intentosFallidos: 0,
      intentosRestantes: 3,
    };
  }

  // 1. Bloqueo permanente previo
  if (registro.es_permanente) {
    return {
      bloqueado: true,
      estado: 'BLOQUEO_PERMANENTE',
      mensaje:
        'Tu cuenta ha sido bloqueada permanentemente por reiterados intentos fallidos. Comunícate con la administración para reactivar tu acceso.',
    };
  }

  // 2. Bloqueo temporal activo
  if (registro.bloqueado_hasta) {
    const bloqueadoHastaDate = new Date(registro.bloqueado_hasta);
    if (bloqueadoHastaDate.getTime() > nowUtc.getTime()) {
      const diffMs = bloqueadoHastaDate.getTime() - nowUtc.getTime();
      const minutosRestantes = Math.max(1, Math.ceil(diffMs / 60000));
      return {
        bloqueado: true,
        estado: 'BLOQUEO_TEMPORAL',
        minutosRestantes,
        nivelBloqueo: registro.bloqueos_acumulados,
        desbloqueaEnUtc: registro.bloqueado_hasta,
        mensaje: `Cuenta bloqueada temporalmente por exceso de intentos fallidos. Podrás reintentar en ${minutosRestantes} minuto(s) o comunicarte con la administración.`,
      };
    }
  }

  // 3. Libre (sin bloqueo activo o con enfriamiento ya expirado)
  const fallidos = registro.bloqueado_hasta && new Date(registro.bloqueado_hasta).getTime() <= nowUtc.getTime()
    ? 0
    : registro.intentos_fallidos || 0;

  const restantes = Math.max(0, 3 - (fallidos % 3));

  return {
    bloqueado: false,
    estado: 'LIBRE',
    intentosFallidos: fallidos,
    intentosRestantes: restantes === 0 ? 3 : restantes,
  };
}

/**
 * Calcula la penalización escalonada cuando se alcanza el 3er intento fallido consecutivo:
 * - Ciclo 1 (1er bloqueo): 15 minutos.
 * - Ciclo 2 (2do bloqueo): 1 hora (60 minutos).
 * - Ciclo 3 (3er bloqueo): Bloqueo permanente.
 */
export function calcularEscalamientoBloqueo(
  bloqueosAcumuladosPrevios: number,
  nowUtc: Date = new Date()
): EscalationResult {
  const nuevoNivel = bloqueosAcumuladosPrevios + 1;

  if (nuevoNivel <= 2) {
    const minutos = nuevoNivel === 1 ? 15 : 60;
    const accionBitacora = nuevoNivel === 1 ? 'BLOQUEO_TEMPORAL_15M' : 'BLOQUEO_TEMPORAL_1H';
    const detalleTiempo = nuevoNivel === 1 ? '15 minutos' : '1 hora';
    const ordinal = nuevoNivel === 1 ? '' : ' por segunda vez';

    return {
      bloqueadoHasta: new Date(nowUtc.getTime() + minutos * 60 * 1000).toISOString(),
      esPermanente: false,
      nuevoNivelBloqueo: nuevoNivel,
      duracionMinutos: minutos,
      accionBitacora,
      mensaje: `Has alcanzado 3 intentos fallidos consecutivos${ordinal}. Tu cuenta ha sido bloqueada temporalmente por ${detalleTiempo} por seguridad.`,
    };
  }

  // Nivel 3 o superior: Bloqueo definitivo
  return {
    bloqueadoHasta: null,
    esPermanente: true,
    nuevoNivelBloqueo: 3,
    duracionMinutos: null,
    accionBitacora: 'BLOQUEO_PERMANENTE',
    mensaje:
      'Tu cuenta ha sido bloqueada permanentemente tras acumular 3 bloqueos temporales. Comunícate con la administración para reactivar tu acceso.',
  };
}

/**
 * Genera el mensaje preventivo de intentos restantes antes de gatillar el bloqueo del ciclo.
 */
export function generarMensajeIntentoFallido(intentosEnCiclo: number): string {
  const restantes = Math.max(0, 3 - intentosEnCiclo);
  if (restantes > 0) {
    return `Correo o contraseña incorrectos. Te quedan ${restantes} intento(s) antes del bloqueo de seguridad.`;
  }
  return 'Correo o contraseña incorrectos.';
}
