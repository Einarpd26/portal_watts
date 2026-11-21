// Estado del polígono de la ruta en edición, que guía la barra flotante del mapa. Sin dependencias de Node.
import type { ConflictoRuta } from '@/types';

export type EstadoPoligono =
  /** Alta sin polígono todavía */
  | { tipo: 'pendiente' }
  /** Edición sin tocar el polígono: se conserva el guardado */
  | { tipo: 'guardado' }
  /** Dibujando o editando vértices, sin un polígono cerrado que validar */
  | { tipo: 'dibujando'; editando: boolean }
  | { tipo: 'validando' }
  | { tipo: 'valido'; vertices: number | null; area_m2: number | null; ajustable: boolean }
  | { tipo: 'invalido'; motivo: string; conflictos: ConflictoRuta[]; ajustable: boolean };

export interface EntradaEstadoPoligono {
  editando: boolean;
  dibujando: boolean;
  /** El dibujo parte de un polígono existente (se editan sus vértices) */
  dibujoConPoligono: boolean;
  isEvaluando: boolean;
  evaluacion: {
    valida: boolean;
    motivo: string | null;
    vertices: number | null;
    area_m2: number | null;
    conflictos: ConflictoRuta[];
  } | null;
}

export function estadoDelPoligono(e: EntradaEstadoPoligono): EstadoPoligono {
  if (e.isEvaluando) return { tipo: 'validando' };
  if (e.evaluacion) {
    return e.evaluacion.valida
      ? { tipo: 'valido', vertices: e.evaluacion.vertices, area_m2: e.evaluacion.area_m2, ajustable: e.dibujando }
      : {
          tipo: 'invalido',
          motivo: e.evaluacion.motivo ?? 'El polígono no es válido.',
          conflictos: e.evaluacion.conflictos,
          ajustable: e.dibujando,
        };
  }
  if (e.dibujando) return { tipo: 'dibujando', editando: e.dibujoConPoligono };
  return e.editando ? { tipo: 'guardado' } : { tipo: 'pendiente' };
}

/** Superficie legible: hectáreas desde 1 ha, metros cuadrados por debajo */
export function formatoArea(m2: number): string {
  return m2 >= 10_000
    ? `${(m2 / 10_000).toLocaleString('es-BO', { maximumFractionDigits: 1 })} ha`
    : `${Math.round(m2)} m²`;
}
