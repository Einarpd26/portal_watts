// Filtros encadenados por territorio (sucursal, zona, supervisor y ruta) que comparten el mapa de clientes (CU-12) y la
// cobertura (CU-13). Sin dependencias de Node ni del navegador.

export type FacetaTerritorio = 'idSucursal' | 'idZona' | 'idSupervisor' | 'idRuta';

/** Orden de depuración: el más general primero */
export const FACETAS_TERRITORIO: readonly FacetaTerritorio[] = ['idSucursal', 'idZona', 'idSupervisor', 'idRuta'];

/** Cada pantalla usa las facetas que le sirven: las que no tiene se tratan como «sin elegir» */
export type FiltrosTerritorio = Partial<Record<FacetaTerritorio, number | null>>;

export interface RutaTerritorial {
  id: number;
  codigo_ruta: string;
  id_zona: number;
  codigo_zona: string;
  id_sucursal: number;
  sucursal_nombre: string;
  id_supervisor?: number | null;
  supervisor_nombre?: string | null;
}

export const pasaTerritorio = (r: RutaTerritorial, f: FiltrosTerritorio): boolean =>
  (f.idSucursal == null || r.id_sucursal === f.idSucursal) &&
  (f.idZona == null || r.id_zona === f.idZona) &&
  (f.idSupervisor == null || r.id_supervisor === f.idSupervisor) &&
  (f.idRuta == null || r.id === f.idRuta);

export interface OpcionesTerritorio<R extends RutaTerritorial> {
  sucursales: Array<[number, string]>;
  zonas: Array<[number, string]>;
  supervisores: Array<[number, string]>;
  rutas: R[];
}

const porNombre = (a: [number, string], b: [number, string]) => a[1].localeCompare(b[1]);

/**
 * Lo que se puede elegir en cada filtro dados los demás: cada lista sale de las rutas que dejan los otros filtros,
 * sin contar el suyo. Con una sucursal elegida solo se ofrecen sus zonas, sus supervisores y sus rutas, y al revés.
 */
export function opcionesTerritorio<R extends RutaTerritorial>(rutas: readonly R[], f: FiltrosTerritorio): OpcionesTerritorio<R> {
  const sin = (faceta: FacetaTerritorio) => rutas.filter((r) => pasaTerritorio(r, { ...f, [faceta]: null }));
  const sucursales = new Map<number, string>();
  for (const r of sin('idSucursal')) sucursales.set(r.id_sucursal, r.sucursal_nombre);
  const zonas = new Map<number, string>();
  for (const r of sin('idZona')) zonas.set(r.id_zona, r.codigo_zona);
  const supervisores = new Map<number, string>();
  for (const r of sin('idSupervisor')) {
    if (r.id_supervisor != null) supervisores.set(r.id_supervisor, r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`);
  }
  return {
    sucursales: [...sucursales.entries()].sort(porNombre),
    zonas: [...zonas.entries()].sort(porNombre),
    supervisores: [...supervisores.entries()].sort(porNombre),
    rutas: [...sin('idRuta')].sort((a, b) => a.codigo_ruta.localeCompare(b.codigo_ruta)),
  };
}

const esPosible = <R extends RutaTerritorial>(o: OpcionesTerritorio<R>, faceta: FacetaTerritorio, valor: number): boolean => {
  if (faceta === 'idRuta') return o.rutas.some((r) => r.id === valor);
  const lista = faceta === 'idSucursal' ? o.sucursales : faceta === 'idZona' ? o.zonas : o.supervisores;
  return lista.some(([id]) => id === valor);
};

/** Quita de los filtros lo elegido que ya no es posible con los demás; el filtro que acaba de cambiar (`conservar`) manda */
export function depurarTerritorio<F extends FiltrosTerritorio>(rutas: readonly RutaTerritorial[], f: F, conservar: FacetaTerritorio | null): F {
  let actual = f;
  for (let i = 0; i < FACETAS_TERRITORIO.length; i++) {
    const o = opcionesTerritorio(rutas, actual);
    const invalida = FACETAS_TERRITORIO.find((faceta) => {
      const valor = actual[faceta];
      return faceta !== conservar && valor != null && !esPosible(o, faceta, valor);
    });
    if (!invalida) break;
    actual = { ...actual, [invalida]: null };
  }
  return actual;
}
