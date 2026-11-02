// Frecuencias de visita de la planificación (CU-09): igual que el tipo frecuencia_visita_enum de la base
import type { Frecuencia } from '@/types';

export const FRECUENCIAS: readonly Frecuencia[] = ['semanal', 'impar', 'par', 'eventual'];

export const FRECUENCIA_LABELS: Record<Frecuencia, string> = {
  semanal: 'Semanal',
  impar: 'Sem. impar',
  par: 'Sem. par',
  eventual: 'Eventual',
};

export function esFrecuencia(valor: unknown): valor is Frecuencia {
  return typeof valor === 'string' && (FRECUENCIAS as readonly string[]).includes(valor);
}
