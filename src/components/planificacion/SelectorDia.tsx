"use client";

import { cn } from '@/utils/cn';
import { DIAS_ORDEN, type DiaKey } from '@/utils/diasSemana';
import { abreviaturaDeDia, type ModoMapa } from '@/utils/planificacionMapa';

interface SelectorDiaProps {
  modo: ModoMapa;
  /** null: toda la semana, solo en Cobertura */
  dia: DiaKey | null;
  onDia: (dia: DiaKey | null) => void;
}

const botonDia = (activo: boolean) =>
  cn(
    'rounded-lg border py-1.5 text-xs font-semibold transition-colors',
    activo ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  );

/** Día en el que se planifica (Planificación) o que se consulta (Cobertura, donde también existe «Todos») */
export default function SelectorDia({ modo, dia, onDia }: SelectorDiaProps) {
  const cobertura = modo === 'cobertura';
  return (
    <section aria-labelledby="mapa-dia">
      <h3 id="mapa-dia" className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        {cobertura ? 'Día' : 'Planificando para'}
      </h3>
      <div className={cn('grid gap-1', cobertura ? 'grid-cols-7' : 'grid-cols-6')}>
        {cobertura && (
          <button type="button" aria-pressed={dia === null} onClick={() => onDia(null)} className={botonDia(dia === null)}>
            Todos
          </button>
        )}
        {DIAS_ORDEN.map((d) => (
          <button key={d} type="button" aria-pressed={dia === d} onClick={() => onDia(d)} className={botonDia(dia === d)}>
            {abreviaturaDeDia(d)}
          </button>
        ))}
      </div>
    </section>
  );
}
