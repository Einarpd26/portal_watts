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
