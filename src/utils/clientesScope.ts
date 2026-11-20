// Alcance de la consulta de clientes en el mapa (CU-12, ADR-005 D4). Gerencia ve toda la empresa, el
// Fiscalizador su sucursal, el Supervisor las zonas que supervisa y el Vendedor solo las rutas donde es titular.
export const PERMISO_MAPA = 'mapa:consultar';
const ROL_SUPERVISOR = 'SUPERVISOR';
const ROL_VENDEDOR = 'VENDEDOR';

interface RolDeConsulta {
  codigo: string;
  permisos: string[];
  alcance_tipo: string;
  id_sucursal: number | null;
}

/** Un solicitante con varios roles ve la unión de lo que cada uno le permite */
export type AlcanceClientes =
  | { tipo: 'global' }
  | { tipo: 'acotado'; sucursales: number[]; comoSupervisor: boolean; comoVendedor: boolean }
  | { tipo: 'denegado' };

export function alcanceDeClientes(solicitante: { roles: RolDeConsulta[] }): AlcanceClientes {
  const conPermiso = solicitante.roles.filter((r) => r.permisos.includes(PERMISO_MAPA));
  if (conPermiso.length === 0) return { tipo: 'denegado' };

  const gestores = conPermiso.filter((r) => r.codigo !== ROL_SUPERVISOR && r.codigo !== ROL_VENDEDOR);
  if (gestores.some((r) => r.alcance_tipo !== 'SUCURSAL')) return { tipo: 'global' };

  // Un alcance de sucursal sin sede no puede acotarse: no aporta nada
  const sucursales = [...new Set(gestores.flatMap((r) => (r.id_sucursal === null ? [] : [r.id_sucursal])))];
  const comoSupervisor = conPermiso.some((r) => r.codigo === ROL_SUPERVISOR);
  const comoVendedor = conPermiso.some((r) => r.codigo === ROL_VENDEDOR);
  if (sucursales.length === 0 && !comoSupervisor && !comoVendedor) return { tipo: 'denegado' };
  return { tipo: 'acotado', sucursales, comoSupervisor, comoVendedor };
}
