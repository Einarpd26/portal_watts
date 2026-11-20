"use client";

import Link from 'next/link';
import { cn } from '@/utils/cn';
import { COLOR_TRAMO, tramoDe } from '@/utils/coberturaRutas';
import type { RutaCobertura } from '@/types';

interface TablaCoberturaProps {
  rutas: RutaCobertura[];
  seleccionId: number | null;
  onElegir: (idRuta: number) => void;
}

/** Una fila por ruta, con clientes atendidos sobre habilitados, el porcentaje y un enlace a sus clientes (CU-13) */
export default function TablaCobertura({ rutas, seleccionId, onElegir }: TablaCoberturaProps) {
  return (
    <div className="max-h-160 overflow-auto rounded-xl border border-gray-200 bg-white">
      <table className="w-full text-left text-xs">
        <caption className="sr-only">Cobertura por ruta en el mes en curso</caption>
        <thead className="sticky top-0 bg-gray-50 text-[10px] font-bold uppercase tracking-wider text-gray-400">
          <tr>
            <th scope="col" className="px-3 py-2">
              Ruta
            </th>
            <th scope="col" className="hidden px-3 py-2 sm:table-cell">
              Zona
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Atendidos
            </th>
            <th scope="col" className="px-3 py-2">
              Cobertura
            </th>
            <th scope="col" className="px-3 py-2">
              <span className="sr-only">Clientes</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rutas.length === 0 && (
            <tr>
              <td colSpan={5} className="px-3 py-4 text-center text-gray-400">
                No hay rutas con estos filtros.
              </td>
            </tr>
          )}
          {rutas.map((r) => (
            <tr key={r.id} aria-selected={seleccionId === r.id} className={cn('transition-colors hover:bg-gray-50', seleccionId === r.id && 'bg-gray-50')}>
              <th scope="row" className="px-3 py-2 font-semibold text-gray-900">
                <button type="button" onClick={() => onElegir(r.id)} className="text-left">
                  <span className="block">{r.codigo_ruta}</span>
                  <span className="block max-w-40 truncate font-normal text-gray-500">{r.ruta}</span>
                </button>
              </th>
              <td className="hidden px-3 py-2 text-gray-600 sm:table-cell">{r.codigo_zona}</td>
              <td className="px-3 py-2 text-right tabular-nums text-gray-700">
                {r.clientes_atendidos}/{r.clientes_habilitados}
              </td>
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-16 overflow-hidden rounded-full bg-gray-100" aria-hidden="true">
                    {/* El ancho y el color de la barra dependen del dato de la ruta: se aplican como estilo */}
                    <div className="h-full rounded-full" style={{ width: `${Math.min(r.porcentaje, 100)}%`, backgroundColor: COLOR_TRAMO[tramoDe(r.porcentaje)] }} />
                  </div>
                  <span className="w-12 font-semibold tabular-nums text-gray-900">{r.porcentaje} %</span>
                </div>
              </td>
              <td className="px-3 py-2 text-right">
                <Link href={`/mapa?ruta=${r.id}`} className="whitespace-nowrap font-medium text-primary-600 hover:underline">
                  Ver clientes
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
