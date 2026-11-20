"use client";

import type { RutaItem } from '@/types';

interface SelectorRutaProps {
  rutas: RutaItem[];
  /** Ruta elegida, o null para todas */
  idRuta: number | null;
  onCambiar: (idRuta: number | null) => void;
}

/** Selector de ruta sin rótulo visible: la barra superior (celular) y la columna lateral (escritorio) lo comparten */
export function SelectorRuta({ rutas, idRuta, onCambiar }: SelectorRutaProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <select
        aria-label="Ruta"
        value={idRuta ?? ''}
        onChange={(e) => onCambiar(e.target.value === '' ? null : Number(e.target.value))}
        className="h-10 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-3 pr-9 text-sm text-gray-900 outline-none transition-colors focus:border-primary-600"
      >
        <option value="">Todas las rutas</option>
        {rutas.map((r) => (
          <option key={r.id} value={r.id}>
            {r.codigo_ruta} — {r.ruta}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-gray-400">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </span>
    </div>
  );
}
