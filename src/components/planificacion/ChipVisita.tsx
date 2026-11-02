import { cn } from '@/utils/cn';
import { FRECUENCIA_LABELS } from '@/utils/frecuencias';
import type { VisitaPlanificada } from '@/types';

interface ChipVisitaProps {
  visita: VisitaPlanificada;
  /** La ruta está planificada más de una vez en la semana (RN-04) */
  duplicada: boolean;
  className?: string;
}

/** Aspecto de una ruta planificada: código, nombre, frecuencia (si no es semanal) y la marca de duplicada */
export default function ChipVisita({ visita, duplicada, className }: ChipVisitaProps) {
  return (
    <span
      className={cn(
        'inline-flex max-w-full flex-col rounded-lg px-2 py-1 text-left leading-tight',
        duplicada ? 'bg-amber-50 ring-1 ring-amber-300' : 'bg-gray-100 text-gray-800',
        className
      )}
    >
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
    </span>
  );
}
