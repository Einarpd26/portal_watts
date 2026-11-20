"use client";

import type { ReactNode } from 'react';
import { AbcBadge } from './AbcBadge';
import { CLASES_ABC, type ConteoPorClase } from '@/utils/clientesMapa';

interface ResumenRutaProps {
  total: number;
  conteo: ConteoPorClase;
  sinUbicacion: number;
  /** Botón junto al título (en el celular, la descarga del reporte) */
  accion?: ReactNode;
}

/**
 * Resumen de los clientes del ámbito elegido: cuántos hay y cuántos de cada clase. Al pie de la columna en el
 * escritorio y como hoja inferior en reposo en el celular.
 */
export function ResumenRuta({ total, conteo, sinUbicacion, accion }: ResumenRutaProps) {
  return (
    <section aria-label="Resumen de clientes" className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,.06)] lg:shadow-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de ruta</p>
        {accion}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
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
