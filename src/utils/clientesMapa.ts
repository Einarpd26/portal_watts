// Lógica pura del mapa de clientes (CU-12, ADR-005): colores de cada clase del Pareto, filtros y conteos.
// Sin dependencias de Node ni del navegador.
import type { ClaseAbc, ClienteMapa, RutaMapa } from '@/types';
import { depurarTerritorio, opcionesTerritorio, pasaTerritorio, type FacetaTerritorio, type OpcionesTerritorio } from './territorio.ts';

/** Orden en que se muestran las clases en la leyenda y los filtros */
export const CLASES_ABC: readonly ClaseAbc[] = ['A', 'B', 'C', 'I'];

export const COLOR_CLASE: Record<ClaseAbc, string> = {
  A: '#16a34a', // green-600
  B: '#d97706', // amber-600
  C: '#dc2626', // red-600
  I: '#111827', // gray-900
};
export const COLOR_SIN_CLASE = '#9ca3af'; // gray-400: cliente no habilitado

export const DESCRIPCION_CLASE: Record<ClaseAbc, string> = {
  A: 'Hasta el 80 % de las ventas de su ruta',
  B: 'Hasta el 95 %',
  C: 'El resto',
  I: 'Sin compras en 6 meses',
};

export const colorDeCliente = (clase: ClaseAbc | null): string => (clase ? COLOR_CLASE[clase] : COLOR_SIN_CLASE);

export interface FiltrosClientes {
  /** Clases visibles; los clientes sin clase (no habilitados) se ocultan salvo que `sinClase` sea true */
  clases: ReadonlySet<ClaseAbc>;
  sinClase: boolean;
  /** Sucursal, zona y ruta elegidas, o null para todas */
  idSucursal: number | null;
  idZona: number | null;
  idRuta: number | null;
  /** Texto libre sobre el código, el nombre, el nombre comercial y la dirección */
  texto: string;
}

export const FILTROS_INICIALES: FiltrosClientes = { clases: new Set(CLASES_ABC), sinClase: true, idSucursal: null, idZona: null, idRuta: null, texto: '' };

const normalizar = (t: string) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Ids de las rutas que pasan los filtros territoriales, o null si no hay ninguno activo */
function rutasDelTerritorio(rutas: readonly RutaMapa[], filtros: FiltrosClientes): ReadonlySet<number> | null {
  if (filtros.idSucursal === null && filtros.idZona === null && filtros.idRuta === null) return null;
  return new Set(rutas.filter((r) => pasaTerritorio(r, filtros)).map((r) => r.id));
}

export function filtrarClientes(clientes: readonly ClienteMapa[], filtros: FiltrosClientes, rutas: readonly RutaMapa[]): ClienteMapa[] {
  const texto = normalizar(filtros.texto);
  const permitidas = rutasDelTerritorio(rutas, filtros);
  return clientes.filter((c) => {
    if (permitidas && !permitidas.has(c.id_ruta)) return false;
    if (c.clasificacion === null ? !filtros.sinClase : !filtros.clases.has(c.clasificacion)) return false;
    if (!texto) return true;
    return normalizar(`${c.codigo_cliente} ${c.nombre_completo} ${c.nombre_comercial ?? ''} ${c.direccion}`).includes(texto);
  });
}

export type ConteoPorClase = Record<ClaseAbc, number> & { sinClase: number };

/** Cantidad de clientes por clase, para la leyenda; no depende de los filtros de clase */
export function conteoPorClase(clientes: readonly ClienteMapa[]): ConteoPorClase {
  const conteo: ConteoPorClase = { A: 0, B: 0, C: 0, I: 0, sinClase: 0 };
  for (const c of clientes) {
    if (c.clasificacion === null) conteo.sinClase += 1;
    else conteo[c.clasificacion] += 1;
  }
  return conteo;
}

/** Los clientes sin ubicación no se pueden dibujar: se cuentan aparte para avisarlo */
export const tieneUbicacion = (c: Pick<ClienteMapa, 'latitud' | 'longitud'>): boolean => c.latitud !== null && c.longitud !== null;

// --- Filtros territoriales encadenados -----------------------------------------------------------------------

export type FacetaClientes = Extract<FacetaTerritorio, 'idSucursal' | 'idZona' | 'idRuta'>;

export const FACETAS_CLIENTES: readonly FacetaClientes[] = ['idSucursal', 'idZona', 'idRuta'];

export type OpcionesClientes = OpcionesTerritorio<RutaMapa>;

export const opcionesClientesSegunFiltros = (rutas: readonly RutaMapa[], f: FiltrosClientes): OpcionesClientes =>
  opcionesTerritorio(rutas, { idSucursal: f.idSucursal, idZona: f.idZona, idRuta: f.idRuta });

/** Quita de los filtros territoriales lo elegido que ya no es posible con los demás; el que acaba de cambiar (`conservar`) manda */
export function depurarFiltrosClientes(rutas: readonly RutaMapa[], f: FiltrosClientes, conservar: FacetaClientes | null): FiltrosClientes {
  const { idSucursal, idZona, idRuta } = depurarTerritorio(rutas, { idSucursal: f.idSucursal, idZona: f.idZona, idRuta: f.idRuta }, conservar);
  return { ...f, idSucursal: idSucursal ?? null, idZona: idZona ?? null, idRuta: idRuta ?? null };
}
