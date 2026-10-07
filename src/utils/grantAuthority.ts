// Autoridad de otorgamiento de acceso (ADR-001 §C y §D, CU-02): quien otorga un acceso
// digital no puede conferir privilegios que no posee ni un alcance mayor que el suyo.
// Separa la decisión de HTTP y de Supabase para poder probarla con dobles.

export interface OtorganteAcceso {
  alcance_tipo: string; // 'GLOBAL' | 'SUCURSAL'
  id_sucursal: number | null;
  permisos: string[];
}

export interface AccesoSolicitado {
  alcance_tipo: 'GLOBAL' | 'SUCURSAL';
  id_sucursal: number | null;
  permisos: string[]; // permisos del rol que se intenta otorgar
}

export type MotivoRechazoOtorgamiento =
  // El alcance incumple el invariante GLOBAL ⟺ sin sucursal (ADR-001 §B)
  | 'ALCANCE_INVALIDO'
  // Un otorgante con alcance SUCURSAL intenta otorgar fuera de su sede o un alcance GLOBAL
  | 'FUERA_DE_SUCURSAL'
  // El rol otorgado tiene permisos que el otorgante no posee (escalada de privilegios)
  | 'ESCALA_PRIVILEGIOS';

export type ResultadoOtorgamiento =
  | { ok: true }
  | { ok: false; motivo: MotivoRechazoOtorgamiento };

/**
 * ¿Puede el otorgante conferir este acceso (rol + alcance)?
 *
 * Reglas (ADR-001):
 * 1. Coherencia de alcance: GLOBAL exige sucursal nula; SUCURSAL exige sucursal (invariante §B).
 * 2. No exceder el alcance propio: un otorgante SUCURSAL solo otorga en su misma sede y nunca GLOBAL.
 * 3. No escalar privilegios: los permisos del rol otorgado deben ser un subconjunto de los del otorgante.
 *    Así un Fiscalizador (sin `catalogos:gestionar`) no puede conferir el rol GERENCIA_COMERCIAL (§C).
 */
export function puedeOtorgarAcceso(
  otorgante: OtorganteAcceso,
  solicitado: AccesoSolicitado
): ResultadoOtorgamiento {
  const alcanceCoherente =
    (solicitado.alcance_tipo === 'GLOBAL' && solicitado.id_sucursal === null) ||
    (solicitado.alcance_tipo === 'SUCURSAL' && solicitado.id_sucursal !== null);
  if (!alcanceCoherente) return { ok: false, motivo: 'ALCANCE_INVALIDO' };

  if (otorgante.alcance_tipo === 'SUCURSAL') {
    if (solicitado.alcance_tipo === 'GLOBAL') return { ok: false, motivo: 'FUERA_DE_SUCURSAL' };
    if (otorgante.id_sucursal === null || solicitado.id_sucursal !== otorgante.id_sucursal) {
      return { ok: false, motivo: 'FUERA_DE_SUCURSAL' };
    }
  }

  const permisosPropios = new Set(otorgante.permisos);
  const excedePrivilegios = solicitado.permisos.some((permiso) => !permisosPropios.has(permiso));
  if (excedePrivilegios) return { ok: false, motivo: 'ESCALA_PRIVILEGIOS' };

  return { ok: true };
}
