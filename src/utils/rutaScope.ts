// Alcance de las rutas (CU-05, ADR-002 D3). El Supervisor opera solo sobre las rutas de las
// zonas que tiene asignadas; Gerencia y Fiscalizador, sobre su jurisdicción de sucursal.
export const PERMISO_RUTAS = 'rutas:gestionar';
const ROL_SUPERVISOR = 'SUPERVISOR';

export interface RolDeAlcance {
  codigo: string;
  permisos: string[];
  alcance_tipo: string;
  id_sucursal: number | null;
}

export type AlcanceRutas =
  | { tipo: 'global' }
  | { tipo: 'sucursales'; ids: number[] }
  | { tipo: 'supervisor'; id_persona: number }
  | { tipo: 'denegado' };

/**
 * Alcance con el que se listan y editan rutas. Un rol con permiso que no es Supervisor define
 * la jurisdicción por sucursal (global gana); si solo hay roles de Supervisor, el alcance son
 * las zonas que la persona supervisa. Un alcance de sucursal sin sede no puede acotarse: se deniega.
 */
export function alcanceDeRutas(solicitante: { id_persona: number; roles: RolDeAlcance[] }): AlcanceRutas {
  const conPermiso = solicitante.roles.filter((r) => r.permisos.includes(PERMISO_RUTAS));
  if (conPermiso.length === 0) return { tipo: 'denegado' };

  const gestores = conPermiso.filter((r) => r.codigo !== ROL_SUPERVISOR);
  if (gestores.length === 0) return { tipo: 'supervisor', id_persona: solicitante.id_persona };

  if (gestores.some((r) => r.alcance_tipo !== 'SUCURSAL')) return { tipo: 'global' };
  const ids = [...new Set(gestores.flatMap((r) => (r.id_sucursal === null ? [] : [r.id_sucursal])))];
  return ids.length > 0 ? { tipo: 'sucursales', ids } : { tipo: 'denegado' };
}
