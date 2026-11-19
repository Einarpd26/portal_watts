"use client";

import { cn } from '@/utils/cn';
import type { ModoMapa } from '@/utils/planificacionMapa';

const OPCIONES: ReadonlyArray<{ modo: ModoMapa; etiqueta: string }> = [
  { modo: 'planificacion', etiqueta: 'Planificación' },
  { modo: 'cobertura', etiqueta: 'Cobertura' },
];

interface ConmutadorModoMapaProps {
  modo: ModoMapa;
  onCambiar: (modo: ModoMapa) => void;
}

/** Conmutador «Planificación / Cobertura» del mapa (ADR-004 D1): qué falta planificar o quién hace qué ruta */
export default function ConmutadorModoMapa({ modo, onCambiar }: ConmutadorModoMapaProps) {
  return (
    <div role="group" aria-label="Modo del mapa" className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.modo}
          type="button"
          aria-pressed={modo === o.modo}
          onClick={() => onCambiar(o.modo)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-semibold transition-colors',
            modo === o.modo ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
