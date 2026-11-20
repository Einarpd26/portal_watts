"use client";

import { cn } from '@/utils/cn';
import { CLASES_ABC, colorDeCliente } from '@/utils/clientesMapa';
import { formatearMonto } from '@/utils/formatoClientes';
import type { ClienteMapa } from '@/types';

/** Cuántos clientes se listan a la vez: el mapa muestra todos, la lista es para encontrar uno */
const LIMITE = 50;

interface ListaClientesProps {
  clientes: ClienteMapa[];
  seleccionId: number | null;
  onElegir: (idCliente: number) => void;
}

const ordenDeClase = (c: ClienteMapa) => (c.clasificacion === null ? CLASES_ABC.length : CLASES_ABC.indexOf(c.clasificacion));

/**
 * Los mismos clientes del mapa en una lista (ADR-004 D7): permite elegir uno sin tocar puntos, con teclado o
 * lector de pantalla. Primero los de mayor clase y, dentro de cada clase, los que más vendieron.
 */
export default function ListaClientes({ clientes, seleccionId, onElegir }: ListaClientesProps) {
  const ordenados = [...clientes].sort((a, b) => ordenDeClase(a) - ordenDeClase(b) || b.total_ventas - a.total_ventas);
  const visibles = ordenados.slice(0, LIMITE);

  return (
    <div className="space-y-1.5">
      <ul className="max-h-72 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white" aria-label="Clientes">
        {visibles.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">No hay clientes con estos filtros.</li>}
        {visibles.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              aria-pressed={seleccionId === c.id}
              onClick={() => onElegir(c.id)}
              className={cn('flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-gray-50', seleccionId === c.id && 'bg-gray-50')}
            >
              {/* El color de la clase es un dato del mapa: se aplica como estilo */}
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: colorDeCliente(c.clasificacion) }} aria-hidden="true" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-semibold text-gray-900">{c.nombre_comercial ?? c.nombre_completo}</span>
                <span className="block truncate text-[11px] text-gray-500">
                  {c.codigo_cliente} · {c.direccion}
                </span>
              </span>
              <span className="shrink-0 text-[11px] font-medium text-gray-500">{formatearMonto(c.total_ventas)}</span>
            </button>
          </li>
        ))}
      </ul>
      {clientes.length > LIMITE && (
        <p className="text-[11px] text-gray-500">
          Mostrando {LIMITE} de {clientes.length}. Afina con los filtros para ver el resto.
        </p>
      )}
    </div>
  );
}
