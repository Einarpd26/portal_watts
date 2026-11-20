// Resumen de la planificación semanal (barra inferior de /planificacion): qué hay planificado y qué falta
import { rutasDuplicadasEnSemana } from './planificacionDuplicados.ts';
import type { SlotItem, VisitaPlanificada } from '@/types';

export interface ResumenPlanificacion {
  slots: number;
  /** Slots sin ninguna ruta planificada */
  slotsSinRutas: number;
  /** Rutas distintas planificadas en la semana */
  rutasPlanificadas: number;
  /** Rutas planificadas más de una vez en la semana (RN-04) */
  rutasDuplicadas: number;
}

export function resumirPlanificacion(slots: readonly SlotItem[], visitas: readonly VisitaPlanificada[]): ResumenPlanificacion {
  const slotsConRutas = new Set(visitas.map((v) => v.id_slot));
  return {
    slots: slots.length,
    slotsSinRutas: slots.filter((s) => !slotsConRutas.has(s.id)).length,
    rutasPlanificadas: new Set(visitas.map((v) => v.id_ruta)).size,
    rutasDuplicadas: rutasDuplicadasEnSemana(visitas).size,
  };
}

const MS_POR_DIA = 86_400_000;

/** Número de semana ISO 8601 (la semana 1 es la que tiene el primer jueves del año) */
export function semanaIso(fecha: Date): number {
  const dia = new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate()));
  dia.setUTCDate(dia.getUTCDate() + 4 - (dia.getUTCDay() || 7));
  const inicioAnio = Date.UTC(dia.getUTCFullYear(), 0, 1);
  return Math.ceil(((dia.getTime() - inicioAnio) / MS_POR_DIA + 1) / 7);
}
