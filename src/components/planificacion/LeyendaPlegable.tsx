"use client";

import { useState } from 'react';
import { cn } from '@/utils/cn';
import { filasDe, type ConteoDeRutas } from './LeyendaMapa';
import type { ModoMapa } from '@/utils/planificacionMapa';

interface LeyendaPlegableProps {
  modo: ModoMapa;
  conteo: ConteoDeRutas;
  /** Texto del día activo para la leyenda («el lunes»); null: toda la semana */
  diaActivo: string | null;
}

/** Leyenda del mapa como una píldora plegable arriba a la derecha: no le quita espacio a la columna lateral */
export default function LeyendaPlegable({ modo, conteo, diaActivo }: LeyendaPlegableProps) {
  const [abierta, setAbierta] = useState(false);
  const filas = filasDe(modo, conteo, diaActivo);

  return (
    <div className="absolute right-3 top-3 z-10">
      <button
        type="button"
        aria-expanded={abierta}
        onClick={() => setAbierta((v) => !v)}
        className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm backdrop-blur-sm hover:bg-white"
      >
        <span className="flex items-center">
          {filas.slice(0, 3).map((f) => (
            // El color es un dato del mapa (no hay clase de Tailwind para él): se aplica como estilo
            <span key={f.etiqueta} className="-ml-0.5 h-2 w-2 rounded-full ring-1 ring-white first:ml-0" style={{ backgroundColor: f.color }} aria-hidden="true" />
          ))}
        </span>
        {modo === 'planificacion' ? 'Planificación' : 'Cobertura'}
        <svg className={cn('h-3 w-3 text-gray-400 transition-transform', abierta && 'rotate-180')} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {abierta && (
        <ul className="absolute right-0 top-full mt-1 min-w-52 space-y-1.5 rounded-xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm">
          {filas.map((f) => (
            <li key={f.etiqueta} className="flex items-center gap-2">
              {/* El color es un dato del mapa (no hay clase de Tailwind para él): se aplica como estilo */}
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={f.trazo ? { border: `2px solid ${f.color}` } : { backgroundColor: f.color }} aria-hidden="true" />
              <span className="flex-1 text-xs text-gray-700">{f.etiqueta}</span>
              <span className="text-[11px] font-medium text-gray-500">{f.cantidad}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
