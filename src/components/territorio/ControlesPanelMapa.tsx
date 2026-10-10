"use client";

import { cn } from '@/utils/cn';

interface BotonPlegarPanelProps {
  plegado: boolean;
  onAlternar: () => void;
}

/** Botón flotante del mapa que pliega o muestra el panel lateral (solo en escritorio) */
export function BotonPlegarPanel({ plegado, onAlternar }: BotonPlegarPanelProps) {
  const etiqueta = plegado ? 'Mostrar panel lateral' : 'Ocultar panel lateral';
  return (
    <button
      type="button"
      aria-pressed={plegado}
      aria-label={etiqueta}
      title={etiqueta}
      onClick={onAlternar}
      className="hidden h-8 w-8 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white lg:flex"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <path d="M9 4v16" />
        <path d={plegado ? 'm13 10 2 2-2 2' : 'm15 10-2 2 2 2'} />
      </svg>
    </button>
  );
}

export type VistaMovil = 'lista' | 'mapa';

interface SelectorVistaMovilProps {
  vista: VistaMovil;
  onCambiar: (vista: VistaMovil) => void;
  /** Texto del botón del panel (por ejemplo "Datos" mientras se edita) */
  etiquetaLista: string;
}

/** En pantallas angostas se ve el panel o el mapa, no ambos */
export function SelectorVistaMovil({ vista, onCambiar, etiquetaLista }: SelectorVistaMovilProps) {
  return (
    <div className="flex shrink-0 border-b border-gray-200 bg-white p-2 lg:hidden" role="group" aria-label="Vista">
      {(['lista', 'mapa'] as const).map((v) => (
        <button
          key={v}
          type="button"
          aria-pressed={vista === v}
          onClick={() => onCambiar(v)}
          className={cn(
            'flex-1 rounded-lg py-1.5 text-sm font-semibold',
            vista === v ? 'bg-primary-600 text-white' : 'text-gray-600 hover:bg-gray-50'
          )}
        >
          {v === 'lista' ? etiquetaLista : 'Mapa'}
        </button>
      ))}
    </div>
  );
}
