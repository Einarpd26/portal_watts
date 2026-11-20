"use client";

import type { ReactNode } from 'react';
import { cn } from '@/utils/cn';
import { COLOR_TRAMO, tramoDe } from '@/utils/coberturaRutas';
import type { RutaCobertura } from '@/types';

interface ListaRutasCoberturaProps {
  rutas: RutaCobertura[];
  seleccionId: number | null;
  /** Abre la ficha de la ruta */
  onElegir: (idRuta: number) => void;
  /** Lleva el mapa hasta la ruta (en el celular, además, cambia de la lista al mapa) */
  onVerEnMapa: (idRuta: number) => void;
  /** Controles que van sobre la lista (en el celular, los filtros que no caben en la barra superior) */
  cabecera?: ReactNode;
}

/**
 * Las rutas de la cobertura, de lo más urgente a lo menos según el orden elegido (CU-13): el color del tramo en el
 * borde, el código y el nombre, los clientes atendidos sobre los habilitados y el porcentaje con su barra.
 */
export default function ListaRutasCobertura({ rutas, seleccionId, onElegir, onVerEnMapa, cabecera }: ListaRutasCoberturaProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {cabecera && <div className="shrink-0 border-b border-gray-100 px-3 py-2">{cabecera}</div>}
      <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label="Rutas">
        {rutas.length === 0 && <li className="px-4 py-6 text-center text-xs text-gray-400">No hay rutas con estos filtros.</li>}
        {rutas.map((r) => {
          const color = COLOR_TRAMO[tramoDe(r.porcentaje)];
          return (
            <li key={r.id} className={cn('flex items-center gap-1 pr-2 transition-colors hover:bg-gray-50', seleccionId === r.id && 'bg-gray-50')}>
              {/* El color del tramo es un dato de la ruta (no hay clase de Tailwind para él): se aplica como estilo */}
              <span className="mr-2 w-1 shrink-0 self-stretch" style={{ backgroundColor: color }} aria-hidden="true" />
              <button type="button" aria-pressed={seleccionId === r.id} onClick={() => onElegir(r.id)} className="min-w-0 flex-1 py-2.5 pr-1 text-left">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-sm font-semibold text-gray-900">
                    {r.codigo_ruta} <span className="font-normal text-gray-500">· {r.ruta}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold tabular-nums text-gray-900">{r.porcentaje} %</span>
                </span>
                <span className="mt-0.5 block text-xs text-gray-400">
                  {r.codigo_zona} · {r.clientes_atendidos}/{r.clientes_habilitados} atendidos
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                  {/* El ancho y el color de la barra dependen del dato de la ruta: se aplican como estilo */}
                  <span className="block h-full rounded-full" style={{ width: `${Math.min(r.porcentaje, 100)}%`, backgroundColor: color }} />
                </span>
              </button>
              <button
                type="button"
                onClick={() => onVerEnMapa(r.id)}
                aria-label={`Ver la ruta ${r.codigo_ruta} en el mapa`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
