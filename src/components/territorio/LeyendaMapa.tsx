"use client";

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { COLOR_CONFLICTO, COLOR_PROPUESTA } from '@/utils/coloresTerritorio';
import type { ZonaDeRuta } from '@/types';

interface LeyendaMapaProps {
  zonas: ZonaDeRuta[];
  coloresZona: Map<number, string>;
}

// Los colores son datos del mapa (no hay clase de Tailwind por zona): se aplican como estilo
function Punto({ color }: { color: string | undefined }) {
  return (
    <span
      className="h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
      style={{ backgroundColor: color }}
      aria-hidden="true"
    />
  );
}

/** Leyenda plegable del mapa (patrón de MapaRutas en inventory-manager) */
export function LeyendaMapa({ zonas, coloresZona }: LeyendaMapaProps) {
  const [abierta, setAbierta] = useState(false);
  if (zonas.length === 0) return null;

  return (
    <div className="absolute right-2 top-2 z-10">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white"
      >
        <span className="flex items-center">
          {zonas.slice(0, 3).map((z) => (
            <span key={z.id} className="-ml-0.5 first:ml-0">
              <Punto color={coloresZona.get(z.id)} />
            </span>
          ))}
        </span>
        Leyenda
        <svg
          className={cn('h-3 w-3 text-gray-400 transition-transform', abierta && 'rotate-180')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {abierta && (
        <div className="absolute right-0 top-full mt-1 min-w-[13rem] rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">Zonas</p>
          <ul className="space-y-1.5">
            {zonas.map((z) => (
              <li key={z.id} className="flex items-center gap-2 text-xs text-gray-700">
                <Punto color={coloresZona.get(z.id)} />
                {z.codigo_zona} — {z.zona}
              </li>
            ))}
          </ul>
          <p className="mb-1.5 mt-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">Al editar</p>
          <ul className="space-y-1.5 text-xs text-gray-700">
            <li className="flex items-center gap-2">
              <Punto color={COLOR_PROPUESTA} />
              Polígono propuesto
            </li>
            <li className="flex items-center gap-2">
              <Punto color={COLOR_CONFLICTO} />
              Ruta en conflicto
            </li>
            <li className="flex items-center gap-2">
              <span className="w-2.5 shrink-0 border-t-2 border-dashed border-gray-500" aria-hidden="true" />
              Contorno de la zona
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
