"use client";

import { useRef, useState } from 'react';
import { AbcBadge } from './AbcBadge';
import { cn } from '@/utils/cn';
import { formatearFecha, formatearMonto } from '@/utils/formatoClientes';
import { useComprasCliente } from '@/hooks/useComprasCliente';
import type { ClienteMapa, RutaItem } from '@/types';


function Dato({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-24 shrink-0 text-gray-500">{etiqueta}</dt>
      <dd className="min-w-0 text-gray-800">{children}</dd>
    </div>
  );
}

function FilaEsqueleto() {
  return (
    <div className="flex animate-pulse items-center justify-between py-2" aria-hidden="true">
      <div className="h-3.5 w-20 rounded bg-gray-100" />
      <div className="h-3.5 w-16 rounded bg-gray-100" />
      <div className="h-3.5 w-10 rounded bg-gray-100" />
    </div>
  );
}

/** Ticket promedio y últimas compras: se piden al elegir el cliente, sin demorar el resto de la ficha */
function Compras({ idCliente }: { idCliente: number }) {
  const { compras, error, isLoading } = useComprasCliente(idCliente);
  return (
    <>
      <dl className="mt-1.5">
        <Dato etiqueta="Ticket promedio">
          {compras?.ticket_promedio != null ? <span className="font-medium">{formatearMonto(compras.ticket_promedio)}</span> : <span className="text-gray-400">{isLoading ? '…' : '—'}</span>}
        </Dato>
      </dl>
      <div className="mt-3 border-t border-gray-100 pt-2.5">
        <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Últimas compras</h4>
        {isLoading && (
          <div className="divide-y divide-gray-50">
            {[0, 1, 2].map((i) => (
              <FilaEsqueleto key={i} />
            ))}
          </div>
        )}
        {error && <p className="py-2 text-xs text-red-600">{error}</p>}
        {compras && compras.compras.length === 0 && <p className="py-2 text-xs text-gray-400">Sin compras en los últimos 6 meses.</p>}
        {compras && compras.compras.length > 0 && (
          <ul className="divide-y divide-gray-50">
            {compras.compras.map((c) => (
              <li key={c.ntr_venta} className="flex items-center justify-between py-2 text-xs">
                <span className="text-gray-500">{formatearFecha(c.fecha_venta)}</span>
                <span className="font-semibold text-gray-900">{formatearMonto(c.total)}</span>
                <span className="text-gray-400">{c.productos} prod.</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

interface FichaClienteProps {
  cliente: ClienteMapa;
  ruta: RutaItem | undefined;
  onCerrar: () => void;
  /** panel: columna junto al mapa (escritorio) · hoja: hoja inferior que se estira (celular) */
  variante: 'panel' | 'hoja';
}

/** Un deslizamiento de más de esta cantidad de píxeles estira o encoge la hoja */
const UMBRAL_DESLIZAMIENTO = 30;

/**
 * Ficha del cliente elegido: su clase del Pareto, lo que vendió y su historial reciente (ADR-004 D7). En el
 * escritorio es un panel junto al mapa. En el celular es una hoja inferior dentro del flujo, que mide un tercio
 * de la pantalla y llega al 80 % al deslizar hacia arriba; hacia abajo se encoge y, si ya está encogida, se cierra.
 * Quien la use debe darle `key` con el id del cliente, para que cada cliente empiece encogida.
 */
export default function FichaCliente({ cliente, ruta, onCerrar, variante }: FichaClienteProps) {
  const clase = cliente.clasificacion;
  const [expandida, setExpandida] = useState(false);
  const inicioY = useRef<number | null>(null);

  const alTocar = (e: React.TouchEvent) => {
    inicioY.current = e.touches[0]?.clientY ?? null;
  };
  const alSoltar = (e: React.TouchEvent) => {
    const fin = e.changedTouches[0]?.clientY;
    if (inicioY.current === null || fin === undefined) return;
    const desplazamiento = inicioY.current - fin;
    inicioY.current = null;
    if (desplazamiento > UMBRAL_DESLIZAMIENTO) setExpandida(true);
    else if (desplazamiento < -UMBRAL_DESLIZAMIENTO) {
      if (expandida) setExpandida(false);
      else onCerrar();
    }
  };

  const contenido = (
    <>
    <div className="mb-3 flex items-start justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <AbcBadge clase={clase} />
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-900">{cliente.nombre_comercial ?? cliente.nombre_completo}</p>
          <p className="text-xs text-gray-400">
            {cliente.codigo_cliente}
            {ruta ? ` · ${ruta.codigo_ruta}` : ''}
          </p>
        </div>
      </div>
      <button type="button" onClick={onCerrar} aria-label="Cerrar la ficha" className="shrink-0 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>

    {!clase && <p className="mb-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">Cliente no habilitado: no se clasifica ni cuenta para la cobertura.</p>}

    <dl className="space-y-1.5">
      <Dato etiqueta="Rubro">{cliente.rubro}</Dato>
      <Dato etiqueta="Ventas (6 meses)">
        <span className="font-medium">{formatearMonto(cliente.total_ventas)}</span>
      </Dato>
    </dl>

    <Compras key={cliente.id} idCliente={cliente.id} />

    <dl className="mt-3 space-y-1.5 border-t border-gray-100 pt-2.5">
      {cliente.ultima_compra && <Dato etiqueta="Última compra">{formatearFecha(cliente.ultima_compra)}</Dato>}
      {cliente.telefono && (
        <Dato etiqueta="Teléfono">
          <a href={`tel:${cliente.telefono}`} className="text-blue-600 underline">
            {cliente.telefono}
          </a>
        </Dato>
      )}
      <Dato etiqueta="Dirección">{cliente.direccion}</Dato>
      {cliente.referencia && <Dato etiqueta="Referencia">{cliente.referencia}</Dato>}
      {ruta && (
        <Dato etiqueta="Ruta">
          {ruta.codigo_ruta} — {ruta.ruta}
        </Dato>
      )}
    </dl>
    </>
  );

  if (variante === 'panel') {
    return (
      <aside aria-label={`Ficha del cliente ${cliente.codigo_cliente}`} className="flex w-80 shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white">
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">{contenido}</div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={`Ficha del cliente ${cliente.codigo_cliente}`}
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-t-3xl border-t border-gray-200 bg-white shadow-[0_-4px_32px_rgba(0,0,0,.1)] transition-[height] duration-300 ease-out',
        expandida ? 'h-[80dvh]' : 'h-[33dvh]'
      )}
    >
      <button
        type="button"
        onClick={() => setExpandida((v) => !v)}
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        aria-label={expandida ? 'Reducir la ficha' : 'Ampliar la ficha'}
        aria-expanded={expandida}
        className="flex shrink-0 justify-center pb-2 pt-3"
      >
        <span className="h-1 w-10 rounded-full bg-gray-300" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">{contenido}</div>
    </aside>
  );
}
