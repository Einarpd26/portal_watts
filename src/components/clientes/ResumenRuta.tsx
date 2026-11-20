"use client";

import { AbcBadge } from './AbcBadge';
import { CLASES_ABC, type ConteoPorClase } from '@/utils/clientesMapa';

interface ResumenRutaProps {
  total: number;
  conteo: ConteoPorClase;
  sinUbicacion: number;
}

/** Resumen al pie de la columna: cuántos clientes hay en el ámbito elegido y cuántos de cada clase */
export function ResumenRuta({ total, conteo, sinUbicacion }: ResumenRutaProps) {
  return (
    <section aria-label="Resumen de clientes" className="border-t border-gray-200 bg-white px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Resumen</p>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="text-sm font-bold text-gray-900">{total} clientes</span>
        {CLASES_ABC.filter((clase) => clase !== 'I' || conteo.I > 0).map((clase) => (
          <span key={clase} className="inline-flex items-center gap-1 text-sm font-medium text-gray-700">
            <AbcBadge clase={clase} tamano="sm" />
            {conteo[clase]}
          </span>
        ))}
        {conteo.sinClase > 0 && <span className="text-xs text-gray-400">{conteo.sinClase} no habilitados</span>}
        {sinUbicacion > 0 && <span className="text-xs text-gray-400">{sinUbicacion} sin ubicación</span>}
      </div>
    </section>
  );
}
