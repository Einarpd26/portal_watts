"use client";

import type { ReactNode } from 'react';
import { COLOR_TRAMO, ETIQUETA_TRAMO, type ResumenCobertura, type TramoCobertura } from '@/utils/coberturaRutas';

const TRAMOS: readonly TramoCobertura[] = ['baja', 'media', 'alta'];

interface ResumenDeCoberturaProps {
  resumen: ResumenCobertura;
  /** Cuántas rutas hay en cada tramo, entre las que pasan los filtros */
  rutasPorTramo: Record<TramoCobertura, number>;
  /** «noviembre de 2026» y «19/11/2026 03:00»; null si todavía no se calculó */
  mes: string | null;
  momento: string | null;
  /** Botón junto al título (en el celular, la descarga del reporte) */
  accion?: ReactNode;
}

/**
 * Resumen de la cobertura de las rutas que se ven: el porcentaje del conjunto (atendidos sobre habilitados, no el
 * promedio de los porcentajes), el reparto por tramo y cuándo se calculó. Al pie de la columna en el escritorio y como
 * hoja inferior en reposo en el celular.
 */
export function ResumenDeCobertura({ resumen, rutasPorTramo, mes, momento, accion }: ResumenDeCoberturaProps) {
  return (
    <section aria-label="Resumen de cobertura" className="shrink-0 border-t border-gray-200 bg-white px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,.06)] lg:shadow-none">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Resumen de cobertura</p>
        {accion}
      </div>
      <p className="text-sm text-gray-700">
        <span className="text-xl font-extrabold text-gray-900">{resumen.porcentaje} %</span>{' '}
        <span className="text-xs text-gray-500">
          {resumen.clientesAtendidos} de {resumen.clientesHabilitados} clientes · {resumen.rutas} {resumen.rutas === 1 ? 'ruta' : 'rutas'}
        </span>
      </p>
      <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
        {TRAMOS.map((t) => (
          <li key={t} className="flex items-center gap-1.5 text-xs text-gray-700" title={ETIQUETA_TRAMO[t]}>
            {/* El color del tramo es un dato del mapa: se aplica como estilo */}
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: COLOR_TRAMO[t] }} aria-hidden="true" />
            <span className="font-semibold">{rutasPorTramo[t]}</span>
            <span className="text-gray-500">{ETIQUETA_TRAMO[t]}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[11px] text-gray-400">
        {mes ?? 'Mes en curso'}
        {momento ? ` · recálculo ${momento}` : ''}
      </p>
    </section>
  );
}
