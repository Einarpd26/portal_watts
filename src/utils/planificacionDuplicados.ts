// RN-04: una ruta se visita una vez por semana. El sistema permite planificarla más veces (coberturas,
// transiciones) pero la marca como duplicada para que el supervisor la resuelva. Las visitas «eventual» no cuentan: marcar una
// planificación como eventual es justamente la forma de resolver el conflicto (CU-09 A3).
//
// Dos visitas de una misma ruta chocan si alguna es «semanal» o si tienen la misma frecuencia; solo el
// par quincenal impar + par convive.
import type { Frecuencia } from '@/types';

export interface VisitaParaDuplicados {
  id_ruta: number;
  frecuencia: Frecuencia;
}

/** Ids de las rutas planificadas más de una vez en la semana (en cualquier slot y día) */
export function rutasDuplicadasEnSemana(visitas: Iterable<VisitaParaDuplicados>): Set<number> {
  const porRuta = new Map<number, { total: number; porFrecuencia: Map<Frecuencia, number> }>();
  for (const v of visitas) {
    if (v.frecuencia === 'eventual') continue;
    let conteo = porRuta.get(v.id_ruta);
    if (!conteo) {
      conteo = { total: 0, porFrecuencia: new Map() };
      porRuta.set(v.id_ruta, conteo);
    }
    conteo.total += 1;
    conteo.porFrecuencia.set(v.frecuencia, (conteo.porFrecuencia.get(v.frecuencia) ?? 0) + 1);
  }

  const duplicadas = new Set<number>();
  for (const [idRuta, { total, porFrecuencia }] of porRuta) {
    if (total < 2) continue;
    const haySemanal = (porFrecuencia.get('semanal') ?? 0) > 0;
    const frecuenciaRepetida = [...porFrecuencia.values()].some((n) => n > 1);
    if (haySemanal || frecuenciaRepetida) duplicadas.add(idRuta);
  }
  return duplicadas;
}
