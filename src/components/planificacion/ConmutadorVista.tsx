"use client";

import { cn } from '@/utils/cn';

export type VistaPlanificacion = 'mapa' | 'calendario';

const OPCIONES: ReadonlyArray<{ vista: VistaPlanificacion; etiqueta: string }> = [
  { vista: 'mapa', etiqueta: 'Mapa' },
  { vista: 'calendario', etiqueta: 'Calendario' },
];

interface ConmutadorVistaProps {
  vista: VistaPlanificacion;
  onCambiar: (vista: VistaPlanificacion) => void;
}

/** Conmutador «Mapa / Calendario» de la planificación (ADR-004 D1) */
export default function ConmutadorVista({ vista, onCambiar }: ConmutadorVistaProps) {
  return (
    <div role="group" aria-label="Vista de la planificación" className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.vista}
          type="button"
          aria-pressed={vista === o.vista}
          onClick={() => onCambiar(o.vista)}
          className={cn(
            'rounded-md px-3 py-1 text-xs font-medium transition-colors',
            vista === o.vista ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
