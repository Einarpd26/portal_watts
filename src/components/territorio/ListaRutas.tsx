"use client";

import Button from '@/components/ui/Button';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import type { RutaItem, ZonaDeRuta } from '@/types';

interface ListaRutasProps {
  rutas: RutaItem[];
  zonas: ZonaDeRuta[];
  coloresZona: Map<number, string>;
  isLoading: boolean;
  filtroZona: number | null;
  onFiltroZona: (id: number | null) => void;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  seleccionId: number | null;
  onSeleccionar: (id: number | null) => void;
  onNueva: () => void;
  onEditar: (ruta: RutaItem) => void;
  onExportar: (ruta: RutaItem) => void;
  isExportando: boolean;
}

/** Panel lateral de rutas: búsqueda, filtro por zona y lista con el color de su zona */
export function ListaRutas({
  rutas,
  zonas,
  coloresZona,
  isLoading,
  filtroZona,
  onFiltroZona,
  busqueda,
  onBusqueda,
  seleccionId,
  onSeleccionar,
  onNueva,
  onEditar,
  onExportar,
  isExportando,
}: ListaRutasProps) {
  const sinZonas = !isLoading && zonas.length === 0;
  const codigoZona = (id: number) => zonas.find((z) => z.id === id)?.codigo_zona ?? '—';

  return (
    <>
      <div className="shrink-0 space-y-2 border-b border-gray-200 bg-gray-50 px-3 py-3">
        <label className="relative block">
          <span className="sr-only">Buscar ruta</span>
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
            placeholder="Buscar ruta por código o nombre"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-8 pr-3 text-sm placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
          />
        </label>
        {zonas.length > 1 && (
          <Select
            label="Zona"
            compact
            value={filtroZona ?? ''}
            onChange={(e) => onFiltroZona(e.target.value ? Number(e.target.value) : null)}
          >
            <option value="">Todas mis zonas</option>
            {zonas.map((z) => (
              <option key={z.id} value={z.id}>
                {z.codigo_zona} — {z.zona}
              </option>
            ))}
          </Select>
        )}
      </div>

      <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label="Rutas">
        {isLoading &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="px-4 py-3" aria-hidden="true">
              <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
            </li>
          ))}
        {sinZonas && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            No tienes zonas asignadas. Pide a la Gerencia o al Fiscalizador que te asigne una.
          </li>
        )}
        {!isLoading && !sinZonas && rutas.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-gray-500">
            {busqueda ? 'Ninguna ruta coincide con la búsqueda.' : 'Aún no hay rutas en esta zona.'}
          </li>
        )}
        {rutas.map((r) => {
          const elegida = r.id === seleccionId;
          return (
            <li key={r.id} className={cn(elegida && 'bg-primary-50')}>
              <button
                type="button"
                aria-pressed={elegida}
                onClick={() => onSeleccionar(elegida ? null : r.id)}
                className={cn(
                  'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors',
                  !elegida && 'hover:bg-gray-50'
                )}
              >
                <span
                  className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                  // El color de la zona es un dato, no un estilo fijo: no hay clase de Tailwind para él
                  style={{ backgroundColor: coloresZona.get(r.id_zona) }}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {r.codigo_ruta} · {r.ruta}
                  </span>
                  <span className="block truncate text-xs text-gray-500">
                    Zona {codigoZona(r.id_zona)}
                    {r.descripcion_ruta ? ` · ${r.descripcion_ruta}` : ''}
                  </span>
                </span>
              </button>
              {elegida && (
                <div className="flex gap-2 px-4 pb-3 pl-9">
                  <Button variant="secondary" size="sm" onClick={() => onEditar(r)}>
                    Editar
                  </Button>
                  <Button variant="secondary" size="sm" onClick={() => onExportar(r)} disabled={isExportando}>
                    Exportar GeoJSON
                  </Button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className="shrink-0 border-t border-gray-200 p-3">
        <Button onClick={onNueva} disabled={sinZonas} className="w-full">
          Nueva ruta
        </Button>
      </div>
    </>
  );
}
