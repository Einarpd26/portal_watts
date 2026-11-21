// Búsqueda y filtros de la lista de personal (CU-03). Sin dependencias de Node ni del navegador.
import type { PersonaConAsignacion } from '../types/index.ts';

export type FiltroCuenta = 'todas' | 'con' | 'sin';

export interface FiltrosPersonal {
  /** Texto libre: nombre, apellido o CI */
  busqueda: string;
  /** '' = todas */
  idSucursal: string;
  /** '' = todos */
  idCargo: string;
  cuenta: FiltroCuenta;
}

export const FILTROS_PERSONAL_INICIALES: FiltrosPersonal = { busqueda: '', idSucursal: '', idCargo: '', cuenta: 'todas' };

/** Minúsculas y sin tildes: «García» se encuentra escribiendo «garcia» */
const normalizar = (texto: string): string => texto.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().trim();

export function hayFiltrosActivos(f: FiltrosPersonal): boolean {
  return f.busqueda.trim() !== '' || f.idSucursal !== '' || f.idCargo !== '' || f.cuenta !== 'todas';
}

export function filtrarPersonal(personas: readonly PersonaConAsignacion[], f: FiltrosPersonal): PersonaConAsignacion[] {
  const buscado = normalizar(f.busqueda);
  return personas.filter((p) => {
    // Cada palabra buscada debe estar en el nombre, en cualquier orden («acosta daniel»), o ser parte de la CI
    const nombre = normalizar(`${p.nombres} ${p.apellidos}`);
    const coincide = buscado === '' || buscado.split(/\s+/).every((palabra) => nombre.includes(palabra)) || p.ci.toLowerCase().includes(buscado);
    if (!coincide) return false;
    if (f.idSucursal !== '' && String(p.asignacion?.sucursal_id) !== f.idSucursal) return false;
    if (f.idCargo !== '' && String(p.asignacion?.cargo_id) !== f.idCargo) return false;
    if (f.cuenta === 'con' && p.auth_user_id === null) return false;
    if (f.cuenta === 'sin' && p.auth_user_id !== null) return false;
    return true;
  });
}
