// Filtros de la consulta de la planificación (CU-10). Sin dependencias de Node ni del navegador.
import type { RutaConsulta, SlotConsulta, VisitaPlanificada } from '@/types';
import type { DiaKey } from './diasSemana.ts';

export interface FiltrosConsulta {
  idSucursal: number | null;
  idZona: number | null;
  idSupervisor: number | null;
  idVendedor: number | null;
  idRuta: number | null;
  /** Día con el que se colorea el mapa; null: toda la semana */
  dia: DiaKey | null;
}

export const FILTROS_CONSULTA_INICIALES: FiltrosConsulta = {
  idSucursal: null,
  idZona: null,
  idSupervisor: null,
  idVendedor: null,
  idRuta: null,
  dia: null,
};

/**
 * Rutas que pasan los filtros y todas sus visitas. Filtrar por vendedor deja las rutas que él visita (algún día),
 * pero conserva todas sus visitas: la duplicada (RN-04) se ve completa aunque otro vendedor también la tenga.
 * El día no recorta las rutas: es el día con el que se colorea el mapa.
 */
export function filtrarConsulta(
  rutas: readonly RutaConsulta[],
  slots: readonly SlotConsulta[],
  visitas: readonly VisitaPlanificada[],
  f: FiltrosConsulta
): { rutas: RutaConsulta[]; visitas: VisitaPlanificada[] } {
  const slotsDelVendedor = new Set(f.idVendedor === null ? [] : slots.filter((s) => s.id_vendedor === f.idVendedor).map((s) => s.id));
  const rutasDelVendedor = new Set(visitas.filter((v) => slotsDelVendedor.has(v.id_slot)).map((v) => v.id_ruta));

  const filtradas = rutas.filter(
    (r) =>
      (f.idSucursal === null || r.id_sucursal === f.idSucursal) &&
      (f.idZona === null || r.id_zona === f.idZona) &&
      (f.idSupervisor === null || r.id_supervisor === f.idSupervisor) &&
      (f.idRuta === null || r.id === f.idRuta) &&
      (f.idVendedor === null || rutasDelVendedor.has(r.id))
  );
  const ids = new Set(filtradas.map((r) => r.id));
  return { rutas: filtradas, visitas: visitas.filter((v) => ids.has(v.id_ruta)) };
}

export interface OpcionesDeConsulta {
  sucursales: Array<[number, string]>;
  zonas: Array<[number, string]>;
  supervisores: Array<[number, string]>;
  vendedores: Array<[number, string]>;
}

const ordenadas = (pares: Map<number, string>): Array<[number, string]> => [...pares.entries()].sort((a, b) => a[1].localeCompare(b[1]));

/** Valores que se pueden elegir en cada filtro, tomados de lo que el usuario tiene a su alcance */
export function opcionesDeConsulta(rutas: readonly RutaConsulta[], slots: readonly SlotConsulta[]): OpcionesDeConsulta {
  const sucursales = new Map<number, string>();
  const zonas = new Map<number, string>();
  const supervisores = new Map<number, string>();
  const vendedores = new Map<number, string>();
  for (const r of rutas) {
    sucursales.set(r.id_sucursal, r.sucursal_nombre);
    zonas.set(r.id_zona, r.zona_nombre || r.codigo_zona);
    if (r.id_supervisor !== null) supervisores.set(r.id_supervisor, r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`);
  }
  for (const s of slots) {
    if (s.id_vendedor !== null) vendedores.set(s.id_vendedor, s.vendedor_nombre ?? `Vendedor ${s.id_vendedor}`);
  }
  return { sucursales: ordenadas(sucursales), zonas: ordenadas(zonas), supervisores: ordenadas(supervisores), vendedores: ordenadas(vendedores) };
}

// --- Filtros encadenados -------------------------------------------------------------------------------------

export type Faceta = 'idSucursal' | 'idZona' | 'idSupervisor' | 'idVendedor' | 'idRuta';

/** Los cinco filtros que se eligen de una lista; el día no es uno de ellos: no recorta nada */
export const FACETAS: readonly Faceta[] = ['idSucursal', 'idZona', 'idSupervisor', 'idVendedor', 'idRuta'];

const LISTA_DE: Record<Faceta, 'sucursales' | 'zonas' | 'supervisores' | 'vendedores' | 'rutas'> = {
  idSucursal: 'sucursales',
  idZona: 'zonas',
  idSupervisor: 'supervisores',
  idVendedor: 'vendedores',
  idRuta: 'rutas',
};

export interface OpcionesEncadenadas extends OpcionesDeConsulta {
  rutas: Array<[number, string]>;
}

/**
 * Valores que se pueden elegir en cada filtro dados los demás. Cada lista sale de las rutas (y sus visitas) que
 * dejan **los otros** filtros, sin contar el suyo: así, con un supervisor elegido solo se ofrecen los vendedores que
 * visitan sus rutas, y nunca se puede armar una combinación que no deje ninguna ruta.
 */
export function opcionesSegunFiltros(
  rutas: readonly RutaConsulta[],
  slots: readonly SlotConsulta[],
  visitas: readonly VisitaPlanificada[],
  f: FiltrosConsulta
): OpcionesEncadenadas {
  const sin = (faceta: Faceta) => filtrarConsulta(rutas, slots, visitas, { ...f, [faceta]: null });
  const deRutas = (faceta: Faceta, clave: (r: RutaConsulta) => number | null, texto: (r: RutaConsulta) => string) => {
    const valores = new Map<number, string>();
    for (const r of sin(faceta).rutas) {
      const id = clave(r);
      if (id !== null) valores.set(id, texto(r));
    }
    return ordenadas(valores);
  };

  const vendedorDelSlot = new Map(slots.flatMap((s) => (s.id_vendedor === null ? [] : [[s.id, { id: s.id_vendedor, nombre: s.vendedor_nombre ?? `Vendedor ${s.id_vendedor}` }] as const])));
  const vendedores = new Map<number, string>();
  for (const v of sin('idVendedor').visitas) {
    const vendedor = vendedorDelSlot.get(v.id_slot);
    if (vendedor) vendedores.set(vendedor.id, vendedor.nombre);
  }

  return {
    sucursales: deRutas('idSucursal', (r) => r.id_sucursal, (r) => r.sucursal_nombre),
    zonas: deRutas('idZona', (r) => r.id_zona, (r) => r.zona_nombre || r.codigo_zona),
    supervisores: deRutas('idSupervisor', (r) => r.id_supervisor, (r) => r.supervisor_nombre ?? `Supervisor ${r.id_supervisor}`),
    vendedores: ordenadas(vendedores),
    rutas: deRutas('idRuta', (r) => r.id, (r) => r.ruta),
  };
}

/**
 * Quita de los filtros lo elegido que ya no es posible con los demás (p. ej. un vendedor que no visita las rutas del
 * supervisor recién elegido). El filtro que acaba de cambiar (`conservar`) no se toca: es el que manda.
 */
export function depurarFiltros(
  rutas: readonly RutaConsulta[],
  slots: readonly SlotConsulta[],
  visitas: readonly VisitaPlanificada[],
  f: FiltrosConsulta,
  conservar: Faceta | null
): FiltrosConsulta {
  let actual = f;
  // Se quita de a uno y se recalcula: al limpiar un filtro, las opciones de los demás pueden volver a ser válidas
  for (let i = 0; i < FACETAS.length; i++) {
    const opciones = opcionesSegunFiltros(rutas, slots, visitas, actual);
    const invalida = FACETAS.find((faceta) => {
      const valor = actual[faceta];
      return faceta !== conservar && valor !== null && !opciones[LISTA_DE[faceta]].some(([id]) => id === valor);
    });
    if (!invalida) break;
    actual = { ...actual, [invalida]: null };
  }
  return actual;
}
