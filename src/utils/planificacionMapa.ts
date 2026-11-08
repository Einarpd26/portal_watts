// Lógica pura de la planificación sobre el mapa (ADR-004): color de cada slot, estado de cada ruta
// para un día y qué hace un clic con el pincel. Sin dependencias de Node ni del navegador.
import { DIAS_ORDEN, DIA_LABELS, type DiaKey } from './diasSemana.ts';
import { FRECUENCIA_LABELS } from './frecuencias.ts';
import { rutasDuplicadasEnSemana, type VisitaParaDuplicados } from './planificacionDuplicados.ts';
import type { Frecuencia, SlotItem, VisitaPlanificada } from '@/types';

// Un color por slot, estable según su posición. Se evita el naranja, reservado a la ruta duplicada, y el
// gris, reservado a la ruta sin planificar. Los ocho se distinguen entre sí sobre el mapa base.
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

/** Color del slot en la posición indicada (desde 0); la paleta se repite si hay más slots que colores */
export const colorDeSlot = (posicion: number): string => PALETA_SLOTS[posicion % PALETA_SLOTS.length];

/** Nombre del slot, o «Slot N» según su posición (desde 0) cuando no tiene uno propio */
export const etiquetaDeSlot = (slot: Pick<SlotItem, 'nombre'>, posicion: number): string => slot.nombre ?? `Slot ${posicion + 1}`;

/** «Lun», «Mar», «Mié»…: tres letras bastan para distinguir los seis días */
export const abreviaturaDeDia = (dia: DiaKey): string => DIA_LABELS[dia].slice(0, 3);

const SUFIJO_FRECUENCIA: Record<Frecuencia, string> = { semanal: '', impar: 'imp', par: 'par', eventual: 'ev' };

export type EstadoRutaEnMapa = 'del_dia' | 'otro_dia' | 'sin_planificar';

/** Lo que el mapa necesita saber de cada ruta para pintarla; viaja como propiedades del polígono */
export interface PropiedadesRutaEnMapa {
  id: number;
  color: string;
  estado: EstadoRutaEnMapa;
  /** RN-04: planificada más de una vez en la semana, con la misma regla que la grilla */
  duplicada: boolean;
  etiqueta: string;
}

/**
 * Estado de cada ruta para el día elegido. Con el día activo, la ruta toma el color del slot que la cubre
 * ese día; si solo se visita otro día conserva el color pero se atenúa y la etiqueta nombra el día; si no
 * está planificada queda gris. El color nunca es el único canal: la etiqueta repite la información.
 */
export function propiedadesDeRutas(
  rutas: ReadonlyArray<{ id: number; codigo_ruta: string }>,
  visitas: readonly VisitaPlanificada[],
  slots: readonly Pick<SlotItem, 'id'>[],
  dia: DiaKey
): PropiedadesRutaEnMapa[] {
  const posicionDeSlot = new Map(slots.map((s, i) => [s.id, i]));
  const duplicadas = rutasDuplicadasEnSemana(visitas);

  const porRuta = new Map<number, VisitaPlanificada[]>();
  for (const v of visitas) porRuta.set(v.id_ruta, [...(porRuta.get(v.id_ruta) ?? []), v]);

  const orden = (v: VisitaPlanificada) => DIAS_ORDEN.indexOf(v.dia) * 1000 + (posicionDeSlot.get(v.id_slot) ?? 0);

  return rutas.map((ruta) => {
    const suyas = [...(porRuta.get(ruta.id) ?? [])].sort((a, b) => orden(a) - orden(b));
    const delDia = suyas.filter((v) => v.dia === dia);
    const cubre = delDia[0] ?? suyas[0];
    const duplicada = duplicadas.has(ruta.id);

    if (!cubre) {
      return { id: ruta.id, color: COLOR_SIN_PLANIFICAR, estado: 'sin_planificar', duplicada, etiqueta: ruta.codigo_ruta };
    }
    const color = colorDeSlot(posicionDeSlot.get(cubre.id_slot) ?? 0);
    if (delDia.length > 0) {
      const sufijo = SUFIJO_FRECUENCIA[cubre.frecuencia];
      return { id: ruta.id, color, estado: 'del_dia', duplicada, etiqueta: sufijo ? `${ruta.codigo_ruta} ${sufijo}` : ruta.codigo_ruta };
    }
    const dias = [...new Set(suyas.map((v) => abreviaturaDeDia(v.dia)))].join('/');
    return { id: ruta.id, color, estado: 'otro_dia', duplicada, etiqueta: `${ruta.codigo_ruta} · ${dias}` };
  });
}

/** «Lun · Slot 1 · sem. impar»: una línea por visita, para el tooltip y la ficha de la ruta */
export function descripcionDeVisita(visita: Pick<VisitaPlanificada, 'dia' | 'frecuencia'>, nombreSlot: string): string {
  return `${abreviaturaDeDia(visita.dia)} · ${nombreSlot} · ${FRECUENCIA_LABELS[visita.frecuencia].toLowerCase()}`;
}

export type AccionPincel = { tipo: 'agregar' } | { tipo: 'quitar'; idVisita: number };

/**
 * Qué hace un clic con el pincel sobre una ruta: si ya está en ese slot y ese día se quita; si no, se
 * planifica con la frecuencia activa. Con varias visitas en la misma celda (p. ej. par + impar) se quita la
 * de la frecuencia activa y, si no hay, la primera.
 */
export function accionDelPincel(
  visitas: readonly VisitaPlanificada[],
  pincel: { idSlot: number; dia: DiaKey; idRuta: number; frecuencia: Frecuencia }
): AccionPincel {
  const enLaCelda = visitas.filter((v) => v.id_slot === pincel.idSlot && v.dia === pincel.dia && v.id_ruta === pincel.idRuta);
  const visita = enLaCelda.find((v) => v.frecuencia === pincel.frecuencia) ?? enLaCelda[0];
  return visita ? { tipo: 'quitar', idVisita: visita.id } : { tipo: 'agregar' };
}

/** ¿La ruta quedaría duplicada en la semana al sumar esta visita? Es el aviso del pincel (ADR-003 D8) */
export function quedaDuplicada(visitas: Iterable<VisitaParaDuplicados>, nueva: VisitaParaDuplicados): boolean {
  return rutasDuplicadasEnSemana([...visitas, nueva]).has(nueva.id_ruta);
}
