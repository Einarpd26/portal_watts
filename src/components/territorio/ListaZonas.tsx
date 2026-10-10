"use client";

import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import type { ZonaItem } from '@/types';

interface ListaZonasProps {
  zonas: ZonaItem[];
  coloresZona: Map<number, string>;
  isLoading: boolean;
  mostrarSucursal: boolean;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  seleccionId: number | null;
  onSeleccionar: (id: number | null) => void;
  onNueva: () => void;
}

const rutasTexto = (n: number) => (n === 1 ? '1 ruta' : `${n} rutas`);

/** Panel lateral de zonas: búsqueda y lista con el color de cada zona, su supervisor y sus rutas */
export function ListaZonas({
  zonas,
  coloresZona,
  isLoading,
  mostrarSucursal,
  busqueda,
  onBusqueda,
  seleccionId,
  onSeleccionar,
  onNueva,
}: ListaZonasProps) {
  return (
    <>
      <div className="shrink-0 border-b border-gray-200 bg-gray-50 px-3 py-3">
        <label className="relative block">
          <span className="sr-only">Buscar zona</span>
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar zona por código o nombre"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
          />
        </label>
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label="Zonas">
        {isLoading &&
          Array.from({ length: 4 }, (_, i) => (
            <li key={i} className="px-4 py-3" aria-hidden="true">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            </li>
          ))}
        {!isLoading && zonas.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            {busqueda ? 'Ninguna zona coincide con la búsqueda.' : 'Aún no hay zonas.'}
          </li>
        )}
        {zonas.map((z) => {
          const elegida = z.id === seleccionId;
          return (
            <li key={z.id} className={cn(elegida && 'bg-primary-50')}>
              <button
                type="button"
                aria-pressed={elegida}
                onClick={() => onSeleccionar(elegida ? null : z.id)}
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', !elegida && 'hover:bg-gray-50')}
              >
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  // El color de la zona es un dato, no un estilo fijo: no hay clase de Tailwind para él
                  style={{ backgroundColor: coloresZona.get(z.id) }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {z.codigo_zona} · {z.zona}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    {mostrarSucursal ? `${z.sucursal_nombre} · ` : ''}
                    {z.supervisor ? z.supervisor.nombre : <span className="text-amber-700">Sin supervisor</span>}
                    {` · ${rutasTexto(z.total_rutas)}`}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 border-t border-gray-200 p-3">
        <Button onClick={onNueva} className="w-full">
          Nueva zona
        </Button>
      </div>
    </>
  );
}
