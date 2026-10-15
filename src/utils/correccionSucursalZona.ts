// Corrección de la sucursal de una zona (CU-04 A4). La sucursal no se edita como un dato más:
// solo se corrige un error de registro, y únicamente si la zona aún no tiene rutas ni supervisor.
// El criterio de permiso es el alcance global (RN-03), no el nombre de un rol.

export type EstadoCorreccionSucursal = 'editable' | 'sin_permiso' | 'con_supervisor' | 'con_rutas';

export interface ContextoCorreccionSucursal {
  alcanceGlobal: boolean;
  totalRutas: number;
  tieneSupervisor: boolean;
}

/**
 * Decide si la sucursal de la zona se puede corregir. Se evalúa primero el permiso para no revelar
 * el estado de la zona a quien no puede actuar, y después las rutas: es el bloqueo que el usuario
 * no puede resolver dentro del sistema (las rutas no cambian de sucursal, ADR-002 D4).
 */
export function estadoCorreccionSucursal(ctx: ContextoCorreccionSucursal): EstadoCorreccionSucursal {
  if (!ctx.alcanceGlobal) return 'sin_permiso';
  if (ctx.totalRutas > 0) return 'con_rutas';
  if (ctx.tieneSupervisor) return 'con_supervisor';
  return 'editable';
}

export const MENSAJE_CORRECCION_SUCURSAL: Record<Exclude<EstadoCorreccionSucursal, 'editable'>, string> = {
  sin_permiso: 'No tienes permiso para corregir la sucursal de esta zona.',
  con_supervisor: 'Quita el supervisor de la zona para poder corregir la sucursal.',
  con_rutas:
    'La zona tiene rutas y las rutas no cambian de sucursal. Para corregirla consulta a un administrador.',
};
