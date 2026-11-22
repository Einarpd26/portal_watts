// Filtro por sucursal de la pestaña de rutas de /territorio. Sin dependencias de Node ni del navegador.
import type { ZonaDeRuta } from '@/types';

export interface SucursalDeZonas {
  id: number;
  nombre: string;
}

/** Sucursales de las zonas a la vista, por nombre */
export function sucursalesDeZonas(zonas: readonly ZonaDeRuta[]): SucursalDeZonas[] {
  const porId = new Map(zonas.map((z) => [z.id_sucursal, z.sucursal_nombre]));
  return [...porId.entries()].map(([id, nombre]) => ({ id, nombre })).sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Zonas de la sucursal elegida; sin sucursal, todas */
export const zonasDeSucursal = (zonas: readonly ZonaDeRuta[], idSucursal: number | null): ZonaDeRuta[] =>
  idSucursal === null ? [...zonas] : zonas.filter((z) => z.id_sucursal === idSucursal);

/** Quita la zona elegida si la sucursal elegida no la contiene; el resto de la elección se conserva */
export const zonaCompatible = (zonas: readonly ZonaDeRuta[], idSucursal: number | null, idZona: number | null): number | null =>
  idZona !== null && zonasDeSucursal(zonas, idSucursal).some((z) => z.id === idZona) ? idZona : null;
