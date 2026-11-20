// Lógica pura de la planificación sobre el mapa (ADR-004): color de cada slot, cómo se pinta cada ruta en
// los modos Planificación y Cobertura y qué hace un clic con el pincel. Sin dependencias de Node ni del navegador.
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from './diasSemana.ts';
import { FRECUENCIA_LABELS } from './frecuencias.ts';
import { rutasDuplicadasEnSemana, type VisitaParaDuplicados } from './planificacionDuplicados.ts';
import type { Frecuencia, SlotItem, VisitaPlanificada } from '@/types';

// Un color por slot, estable según su posición (modo Cobertura). Se evita el naranja, reservado a la ruta
// duplicada, y el gris, reservado a la ruta sin planificar. Los ocho se distinguen entre sí sobre el mapa base.
export const PALETA_SLOTS = [
  '#2563eb', // blue-600
  '#16a34a', // green-600
  '#9333ea', // purple-600
  '#db2777', // pink-600
  '#0891b2', // cyan-600
  '#a16207', // yellow-700
  '#4f46e5', // indigo-600
  '#be123c', // rose-700
] as const;

export const COLOR_SIN_PLANIFICAR = '#9ca3af'; // gray-400
export const COLOR_DUPLICADA = '#ea580c'; // orange-600
// Modo Planificación: el color dice el estado de la ruta, no el slot que la cubre
export const COLOR_PLANIFICADA = '#047857'; // emerald-700
export const COLOR_OTRO_DIA = '#f59e0b'; // amber-500

/** Color del slot en la posición indicada (desde 0); la paleta se repite si hay más slots que colores */
export const colorDeSlot = (posicion: number): string => PALETA_SLOTS[posicion % PALETA_SLOTS.length];

/** Nombre del slot, o «Slot N» según su posición (desde 0) cuando no tiene uno propio */
export const etiquetaDeSlot = (slot: Pick<SlotItem, 'nombre'>, posicion: number): string => slot.nombre ?? `Slot ${posicion + 1}`;

/** «Lun», «Mar», «Mié»…: tres letras bastan para distinguir los seis días */
export const abreviaturaDeDia = (dia: DiaKey): string => DIA_LABELS[dia].slice(0, 3);

const SUFIJO_FRECUENCIA: Record<Frecuencia, string> = { semanal: '', impar: 'imp', par: 'par', eventual: 'ev' };

export type EstadoRutaEnMapa = 'del_dia' | 'otro_dia' | 'sin_planificar';

/** Planificación: ¿qué falta planificar? (color por estado). Cobertura: ¿quién hace qué ruta? (color por slot) */
export type ModoMapa = 'planificacion' | 'cobertura';

/** Lo que el mapa necesita saber de cada ruta para pintarla; viaja como propiedades del polígono */
export interface PropiedadesRutaEnMapa {
  id: number;
  color: string;
  estado: EstadoRutaEnMapa;
  /** RN-04: planificada más de una vez en la semana, con la misma regla que la grilla */
  duplicada: boolean;
  etiqueta: string;
}

export interface OpcionesDelMapa {
  modo: ModoMapa;
  /** Día activo; null: toda la semana (solo tiene sentido en Cobertura) */
  dia: DiaKey | null;
}

/**
 * Cómo se pinta cada ruta (ADR-004 D3).
 * - Planificación: color por estado. Planificada el día activo (verde), planificada solo otro día (ámbar, tenue,
 *   con los días en la etiqueta) o sin planificar (gris).
 * - Cobertura: color del slot que cubre la ruta en el día activo, o en cualquier día si es toda la semana. Lo que
 *   no se visita en esa selección queda gris.
 * En ambos modos el trazo naranja marca la duplicada y la etiqueta repite la información: el color nunca es el
 * único canal.
 */
export function propiedadesDeRutas(
  rutas: ReadonlyArray<{ id: number; codigo_ruta: string }>,
  visitas: readonly VisitaPlanificada[],
  slots: readonly Pick<SlotItem, 'id'>[],
  { modo, dia }: OpcionesDelMapa
): PropiedadesRutaEnMapa[] {
  const posicionDeSlot = new Map(slots.map((s, i) => [s.id, i]));
  const duplicadas = rutasDuplicadasEnSemana(visitas);

  const porRuta = new Map<number, VisitaPlanificada[]>();
  for (const v of visitas) porRuta.set(v.id_ruta, [...(porRuta.get(v.id_ruta) ?? []), v]);

  const orden = (v: VisitaPlanificada) => DIAS_ORDEN.indexOf(v.dia) * 1000 + (posicionDeSlot.get(v.id_slot) ?? 0);
  const diasDe = (vs: readonly VisitaPlanificada[]) => [...new Set(vs.map((v) => abreviaturaDeDia(v.dia)))].join('/');

  return rutas.map((ruta) => {
    const suyas = [...(porRuta.get(ruta.id) ?? [])].sort((a, b) => orden(a) - orden(b));
    const delDia = dia === null ? suyas : suyas.filter((v) => v.dia === dia);
    const cubre = delDia[0];
    const duplicada = duplicadas.has(ruta.id);
    const base = { id: ruta.id, duplicada };
    const sinPlanificar = { ...base, color: COLOR_SIN_PLANIFICAR, estado: 'sin_planificar' as const, etiqueta: ruta.codigo_ruta };
    const sufijo = cubre ? SUFIJO_FRECUENCIA[cubre.frecuencia] : '';
    const conFrecuencia = sufijo ? `${ruta.codigo_ruta} ${sufijo}` : ruta.codigo_ruta;

    if (modo === 'cobertura') {
      if (!cubre) return sinPlanificar;
      const color = colorDeSlot(posicionDeSlot.get(cubre.id_slot) ?? 0);
      const etiqueta = dia === null ? `${ruta.codigo_ruta} · ${diasDe(suyas)}` : conFrecuencia;
      return { ...base, color, estado: 'del_dia', etiqueta };
    }

    if (cubre) return { ...base, color: COLOR_PLANIFICADA, estado: 'del_dia', etiqueta: conFrecuencia };
    if (suyas.length > 0) {
      return { ...base, color: COLOR_OTRO_DIA, estado: 'otro_dia', etiqueta: `${ruta.codigo_ruta} · ${diasDe(suyas)}` };
    }
    return sinPlanificar;
  });
}

/** «Lun · Slot 1 · sem. impar»: una línea por visita, para el tooltip y la ficha de la ruta */
export function descripcionDeVisita(visita: Pick<VisitaPlanificada, 'dia' | 'frecuencia'>, nombreSlot: string): string {
  return `${abreviaturaDeDia(visita.dia)} · ${nombreSlot} · ${FRECUENCIA_LABELS[visita.frecuencia].toLowerCase()}`;
}

/** ¿Ya existe una visita de esa ruta en ese slot, día y frecuencia? Planificar lo mismo otra vez no tiene sentido (CU-09 A1) */
export function existeVisita(
  visitas: readonly VisitaPlanificada[],
  visita: { idSlot: number; dia: DiaKey; idRuta: number; frecuencia: Frecuencia }
): boolean {
  return visitas.some((v) => v.id_slot === visita.idSlot && v.dia === visita.dia && v.id_ruta === visita.idRuta && v.frecuencia === visita.frecuencia);
}

/** ¿La ruta quedaría duplicada en la semana al sumar esta visita? Es el aviso del pincel (ADR-003 D8) */
export function quedaDuplicada(visitas: Iterable<VisitaParaDuplicados>, nueva: VisitaParaDuplicados): boolean {
  return rutasDuplicadasEnSemana([...visitas, nueva]).has(nueva.id_ruta);
}
