"use client";

import { cn } from '@/utils/cn';

export type ModoVista = 'clientes' | 'cobertura';

const OPCIONES: ReadonlyArray<{ modo: ModoVista; etiqueta: string }> = [
  { modo: 'clientes', etiqueta: 'Clientes' },
  { modo: 'cobertura', etiqueta: 'Cobertura' },
];

interface ConmutadorVistaProps {
  modo: ModoVista;
  onCambiar: (modo: ModoVista) => void;
}

/** Conmutador «Clientes / Cobertura» del mapa: qué clase tiene cada cliente o qué tanto se atiende cada ruta */
export function ConmutadorVista({ modo, onCambiar }: ConmutadorVistaProps) {
  return (
    <div role="group" aria-label="Qué mostrar en el mapa" className="grid grid-cols-2 rounded-lg border border-gray-200 bg-gray-100 p-0.5">
      {OPCIONES.map((o) => (
        <button
          key={o.modo}
          type="button"
          aria-pressed={modo === o.modo}
          onClick={() => onCambiar(o.modo)}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-semibold transition-colors',
            modo === o.modo ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
          )}
        >
          {o.etiqueta}
        </button>
      ))}
    </div>
  );
}
