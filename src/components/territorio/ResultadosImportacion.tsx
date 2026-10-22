"use client";

import Alert from '@/components/ui/Alert';
import { cn } from '@/utils/cn';
import {
  COLOR_ESTADO,
  ESTADOS_ORDEN,
  ETIQUETA_ESTADO,
  ETIQUETA_ESTADO_SINGULAR,
  type FiltroEstado,
} from '@/utils/importacionRutas';
import type { FilaInforme, ResumenInforme } from '@/utils/rutaInforme';

interface ResultadosImportacionProps {
  resumen: ResumenInforme;
  /** Filas ya filtradas por estado y búsqueda */
  filas: FilaInforme[];
  confirmada: boolean;
  /** Nombre de la sucursal elegida, para el aviso de sucursal dudosa */
  sucursal: string;
  filtroEstado: FiltroEstado;
  onFiltroEstado: (estado: FiltroEstado) => void;
  busqueda: string;
  onBusqueda: (texto: string) => void;
  seleccionPosicion: number | null;
  onSeleccionar: (posicion: number | null) => void;
  /** En escritorio el panel se puede plegar; plegado deja de ocupar ancho */
  plegado: boolean;
}

function Punto({ color }: { color: string }) {
  // El color del estado es un dato, no un estilo fijo: no hay clase de Tailwind para él
  return <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} aria-hidden="true" />;
}

/**
 * Panel derecho de la importación por lote (CU-16): aparece al tener la vista previa y reúne los conteos,
 * los filtros y la lista de rutas con lo que hay que corregir en el origen.
 */
export function ResultadosImportacion({
  resumen,
  filas,
  confirmada,
  sucursal,
  filtroEstado,
  onFiltroEstado,
  busqueda,
  onBusqueda,
  seleccionPosicion,
  onSeleccionar,
  plegado,
}: ResultadosImportacionProps) {
  // Todas rechazadas porque la zona no existe: casi seguro se eligió otra sucursal
  const sucursalDudosa = resumen.total > 0 && resumen.por_tipo.zona_inexistente === resumen.total;

  return (
    <aside
      aria-label="Resultados de la vista previa"
      className={cn(
        'min-h-0 w-full shrink-0 flex-col border-t border-gray-200 bg-white lg:w-96 lg:border-l lg:border-t-0',
        plegado ? 'flex lg:hidden' : 'flex'
      )}
    >
      <div className="shrink-0 space-y-3 border-b border-gray-200 bg-gray-50 px-4 py-3">
        <h2 className="text-sm font-bold text-gray-900">
          {confirmada ? 'Resultado de la importación' : 'Vista previa'} · {resumen.total} rutas
        </h2>
        {sucursalDudosa && (
          <Alert state="warning">Ninguna zona del archivo existe en {sucursal}. Revisa que la sucursal elegida sea la correcta.</Alert>
        )}
        <div role="group" aria-label="Filtrar por estado" className="flex flex-wrap gap-1.5">
          <button
            type="button"
            aria-pressed={filtroEstado === 'todas'}
            onClick={() => onFiltroEstado('todas')}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-medium',
              filtroEstado === 'todas' ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            Todas {resumen.total}
          </button>
          {ESTADOS_ORDEN.map((estado) => (
            <button
              key={estado}
              type="button"
              aria-pressed={filtroEstado === estado}
              onClick={() => onFiltroEstado(filtroEstado === estado ? 'todas' : estado)}
              className={cn(
                'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
                filtroEstado === estado ? 'border-gray-900 bg-gray-100 text-gray-900' : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLOR_ESTADO[estado] }} aria-hidden="true" />
              {ETIQUETA_ESTADO[estado]} {resumen.por_estado[estado]}
            </button>
          ))}
        </div>
        <label className="block">
          <span className="sr-only">Buscar ruta o zona</span>
          <input
            type="search"
            value={busqueda}
            onChange={(e) => onBusqueda(e.target.value)}
            placeholder="Buscar por código de ruta o de zona"
            className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm placeholder-gray-400 focus:border-primary-600 focus:outline-none focus:ring-2 focus:ring-primary-600/30"
          />
        </label>
      </div>

      <ul className="max-h-96 min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto lg:max-h-none" aria-label="Rutas del archivo">
        {filas.length === 0 && <li className="px-4 py-8 text-center text-sm text-gray-500">Ninguna ruta coincide con el filtro.</li>}
        {filas.map((f) => {
          const elegida = f.posicion === seleccionPosicion;
          return (
            <li key={f.posicion} className={cn(elegida && 'bg-primary-50')}>
              <button
                type="button"
                aria-pressed={elegida}
                onClick={() => onSeleccionar(elegida ? null : f.posicion)}
                className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition-colors', !elegida && 'hover:bg-gray-50')}
              >
                <Punto color={COLOR_ESTADO[f.estado]} />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-gray-900">
                    {f.codigo_ruta ?? `Ruta ${f.posicion} del archivo`}
                    {f.codigo_zona ? ` · Zona ${f.codigo_zona}` : ''}
                  </span>
                  <span className="block text-xs text-gray-500">{f.estado === 'rechazada' ? f.problema : ETIQUETA_ESTADO_SINGULAR[f.estado]}</span>
                  {elegida && f.estado === 'rechazada' && (
                    <span className="mt-1 block space-y-1 text-xs text-gray-700">
                      {f.detalle && <span className="block">{f.detalle}</span>}
                      {f.accion && (
                        <span className="block">
                          <span className="font-semibold">Qué corregir en el origen: </span>
                          {f.accion}
                        </span>
                      )}
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
