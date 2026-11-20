"use client";

import { cn } from '@/utils/cn';
import { FRECUENCIAS, FRECUENCIA_LABELS } from '@/utils/frecuencias';
import type { Frecuencia } from '@/types';

interface SelectorFrecuenciaProps {
  frecuencia: Frecuencia;
  onFrecuencia: (frecuencia: Frecuencia) => void;
}

/** Frecuencia de visita con la que se planifica una ruta */
export default function SelectorFrecuencia({ frecuencia, onFrecuencia }: SelectorFrecuenciaProps) {
  return (
    <section aria-labelledby="asignar-frecuencia">
      <h4 id="asignar-frecuencia" className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        Frecuencia de visita
      </h4>
      <div className="grid grid-cols-2 gap-1">
        {FRECUENCIAS.map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={frecuencia === f}
            onClick={() => onFrecuencia(f)}
            className={cn(
              'rounded-lg border py-1.5 text-xs font-medium transition-colors',
              frecuencia === f ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            )}
          >
            {FRECUENCIA_LABELS[f]}
          </button>
        ))}
      </div>
    </section>
  );
}
