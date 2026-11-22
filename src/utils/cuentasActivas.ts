// Textos de las cuentas activas de /admin/usuarios. Sin dependencias de Node ni del navegador.
import type { RolActivo } from '@/types';

/** Alcance del rol principal de una cuenta: «Global», «Sucursal #3» o un guion si no tiene */
export function textoDeAlcance(rol: Pick<RolActivo, 'alcance_tipo' | 'id_sucursal'> | undefined): string {
  if (rol?.alcance_tipo === 'GLOBAL') return 'Global';
  return rol?.id_sucursal ? `Sucursal #${rol.id_sucursal}` : '—';
}
