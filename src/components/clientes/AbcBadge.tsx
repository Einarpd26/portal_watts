"use client";

import { cn } from '@/utils/cn';
import type { ClaseAbc } from '@/types';

const ESTILO: Record<ClaseAbc, string> = {
  A: 'border-green-200 bg-green-100 text-green-800',
  B: 'border-amber-200 bg-amber-100 text-amber-800',
  C: 'border-red-200 bg-red-100 text-red-800',
  I: 'border-gray-900 bg-gray-900 text-white',
};
const ESTILO_SIN_CLASE = 'border-gray-200 bg-gray-100 text-gray-500';

const TAMANO = {
  sm: 'h-5 w-5 text-[10px]',
  md: 'h-6 w-6 text-xs',
} as const;

interface AbcBadgeProps {
  /** null: cliente no habilitado, no se clasifica */
  clase: ClaseAbc | null;
  tamano?: keyof typeof TAMANO;
}

/** Insignia redonda con la clase del cliente en el Pareto de su ruta (la misma de la lista, la ficha y el resumen) */
export function AbcBadge({ clase, tamano = 'md' }: AbcBadgeProps) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full border font-bold', TAMANO[tamano], clase ? ESTILO[clase] : ESTILO_SIN_CLASE)}
      aria-label={clase ? `Clase ${clase}` : 'No habilitado'}
    >
      {clase ?? '–'}
    </span>
  );
}
