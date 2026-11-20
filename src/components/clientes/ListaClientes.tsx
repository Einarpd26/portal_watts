"use client";

import { AbcBadge } from './AbcBadge';
import { cn } from '@/utils/cn';
import { CLASES_ABC } from '@/utils/clientesMapa';
import { formatearMonto } from '@/utils/formatoClientes';
import type { ClienteMapa } from '@/types';
import CampoBusqueda from '@/components/ui/CampoBusqueda';

/** Cuántos clientes se listan a la vez: el mapa muestra todos, la lista es para encontrar uno */
const LIMITE = 50;

interface ListaClientesProps {
  clientes: ClienteMapa[];
  seleccionId: number | null;
  /** Abre la ficha del cliente */
  onElegir: (idCliente: number) => void;
  /** Lleva el mapa hasta el cliente (en el celular, además, cambia de la lista al mapa) */
  onVerEnMapa: (idCliente: number) => void;
  texto: string;
  onTexto: (texto: string) => void;
  /** Lo que va bajo el buscador: los interruptores de clase */
  filtros?: React.ReactNode;
}

const ordenDeClase = (c: ClienteMapa) => (c.clasificacion === null ? CLASES_ABC.length : CLASES_ABC.indexOf(c.clasificacion));

/**
 * Los mismos clientes del mapa en una lista (ADR-004 D7): permite elegir uno sin tocar puntos, con teclado o
 * lector de pantalla. Primero los de mayor clase y, dentro de cada clase, los que más vendieron.
 */
export default function ListaClientes({ clientes, seleccionId, onElegir, onVerEnMapa, texto, onTexto, filtros }: ListaClientesProps) {
  const ordenados = [...clientes].sort((a, b) => ordenDeClase(a) - ordenDeClase(b) || b.total_ventas - a.total_ventas);
  const visibles = ordenados.slice(0, LIMITE);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 space-y-2 border-b border-gray-100 px-3 py-2">
        <CampoBusqueda valor={texto} onCambiar={onTexto} placeholder="Buscar cliente..." etiqueta="Buscar cliente por código, nombre o dirección" />
        {filtros}
      </div>
      <ul className="min-h-0 flex-1 divide-y divide-gray-100 overflow-y-auto" aria-label="Clientes">
        {visibles.length === 0 && <li className="px-4 py-6 text-center text-xs text-gray-400">No hay clientes con estos filtros.</li>}
        {visibles.map((c) => (
          <li key={c.id} className={cn('flex items-center gap-1 pr-2 transition-colors hover:bg-gray-50', seleccionId === c.id && 'bg-gray-50')}>
            <button type="button" aria-pressed={seleccionId === c.id} onClick={() => onElegir(c.id)} className="flex min-w-0 flex-1 items-center gap-3 px-3 py-2.5 text-left">
              <AbcBadge clase={c.clasificacion} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-gray-900">{c.nombre_comercial ?? c.nombre_completo}</span>
                <span className="block truncate text-xs text-gray-400">
                  {c.codigo_cliente} · {c.rubro}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-gray-500">{formatearMonto(c.total_ventas)}</span>
            </button>
            {c.latitud !== null && c.longitud !== null && (
              <button
                type="button"
                onClick={() => onVerEnMapa(c.id)}
                aria-label={`Ver a ${c.nombre_comercial ?? c.nombre_completo} en el mapa`}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-gray-400 transition-colors hover:bg-red-50 hover:text-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
                </svg>
              </button>
            )}
          </li>
        ))}
      </ul>
      {clientes.length > LIMITE && (
        <p className="border-t border-gray-100 px-3 py-1.5 text-[11px] text-gray-500">
          Mostrando {LIMITE} de {clientes.length}. Afina con los filtros para ver el resto.
        </p>
      )}
    </div>
  );
}
