"use client";

import { cn } from '@/utils/cn';
import { FRECUENCIA_LABELS } from '@/utils/frecuencias';
import type { VisitaPlanificada } from '@/types';

interface CeldaDiaProps {
  visitas: VisitaPlanificada[];
  /** Ids de las rutas planificadas más de una vez en la semana (RN-04) */
  duplicadas: ReadonlySet<number>;
  editMode: boolean;
  etiqueta: string;
  onAgregar: () => void;
  onSeleccionar: (visita: VisitaPlanificada) => void;
}

/** Celda de un slot y un día: las rutas planificadas como chips y, en modo edición, el botón para agregar */
export default function CeldaDia({ visitas, duplicadas, editMode, etiqueta, onAgregar, onSeleccionar }: CeldaDiaProps) {
  return (
    <td
      className={cn(
        'min-w-0 overflow-hidden border-r border-gray-200 p-2 align-top last:border-r-0',
        visitas.length === 0 && !editMode ? 'bg-zinc-50' : 'bg-white'
      )}
    >
      <div className="flex min-h-[2rem] flex-col gap-1">
        {visitas.map((visita) => {
          const duplicada = duplicadas.has(visita.id_ruta);
          const contenido = (
            <>
              <span className="break-words text-xs font-semibold">{visita.codigo_ruta}</span>
              <span className="break-words text-[10px] leading-tight text-gray-500">{visita.ruta}</span>
              {(visita.frecuencia !== 'semanal' || duplicada) && (
                <span className="flex flex-wrap gap-1">
                  {visita.frecuencia !== 'semanal' && (
                    <span className="rounded bg-indigo-50 px-1 text-[10px] font-medium text-indigo-600">
                      {FRECUENCIA_LABELS[visita.frecuencia]}
                    </span>
                  )}
                  {duplicada && (
                    <span
                      className="rounded bg-amber-100 px-1 text-[10px] font-semibold text-amber-800"
                      title="Ruta duplicada: está planificada más de una vez en la semana"
                    >
                      Duplicada
                    </span>
                  )}
                </span>
              )}
            </>
          );
          const clases = cn(
            'inline-flex max-w-full flex-col rounded-lg px-2 py-1 text-left leading-tight',
            duplicada ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-gray-100 text-gray-800'
          );
          return editMode ? (
            <button
              key={visita.id}
              type="button"
              onClick={() => onSeleccionar(visita)}
              className={cn(clases, 'transition hover:ring-1 hover:ring-primary-400')}
              aria-label={`Editar la ruta ${visita.codigo_ruta}`}
            >
              {contenido}
            </button>
          ) : (
            <span key={visita.id} className={clases}>
              {contenido}
            </span>
          );
        })}

        {editMode && (
          <button
            type="button"
            onClick={onAgregar}
            aria-label={`Agregar ruta: ${etiqueta}`}
            className="self-start rounded-lg border border-dashed border-gray-300 px-2 py-0.5 text-xs text-gray-400 transition hover:border-primary-400 hover:text-primary-600"
          >
            + Ruta
          </button>
        )}
      </div>
    </td>
  );
}
