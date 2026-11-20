"use client";

import { COLOR_DUPLICADA, COLOR_OTRO_DIA, COLOR_PLANIFICADA, COLOR_SIN_PLANIFICAR, type ModoMapa } from '@/utils/planificacionMapa';

export interface ConteoDeRutas {
  delDia: number;
  otroDia: number;
  sinPlanificar: number;
  duplicadas: number;
}

interface LeyendaMapaProps {
  modo: ModoMapa;
  conteo: ConteoDeRutas;
  /** Texto del día activo para la leyenda («el lunes»); null: toda la semana */
  diaActivo: string | null;
}

export interface Fila {
  etiqueta: string;
  color: string;
  cantidad: number;
  /** Las duplicadas se marcan con trazo, no con relleno */
  trazo?: boolean;
}

export function filasDe(modo: ModoMapa, c: ConteoDeRutas, diaActivo: string | null): Fila[] {
  const duplicadas: Fila = { etiqueta: 'Duplicada (RN-04)', color: COLOR_DUPLICADA, cantidad: c.duplicadas, trazo: true };
  if (modo === 'planificacion') {
    return [
      { etiqueta: `Planificada ${diaActivo ?? 'la semana'}`, color: COLOR_PLANIFICADA, cantidad: c.delDia },
      { etiqueta: 'Planificada otro día', color: COLOR_OTRO_DIA, cantidad: c.otroDia },
      { etiqueta: 'Sin planificar', color: COLOR_SIN_PLANIFICAR, cantidad: c.sinPlanificar },
      duplicadas,
    ];
  }
  return [{ etiqueta: diaActivo ? `Sin cubrir ${diaActivo}` : 'Sin cubrir en la semana', color: COLOR_SIN_PLANIFICAR, cantidad: c.sinPlanificar }, duplicadas];
}

/**
 * Leyenda del mapa (ADR-004 D3). En Planificación son los estados de la ruta y su avance: se termina cuando no
 * queda gris. En Cobertura los colores de los slots ya están en la lista de slots, y aquí quedan lo sin cubrir y
 * lo duplicado.
 */
export default function LeyendaMapa({ modo, conteo, diaActivo }: LeyendaMapaProps) {
  return (
    <section aria-labelledby="leyenda-mapa">
      <h3 id="leyenda-mapa" className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400">
        Leyenda
      </h3>
      <ul className="space-y-1">
        {filasDe(modo, conteo, diaActivo).map((f) => (
          <li key={f.etiqueta} className="flex items-center gap-2 px-2">
            {/* El color es un dato del mapa (no hay clase de Tailwind para él): se aplica como estilo */}
            <span
              className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10"
              style={f.trazo ? { border: `2px solid ${f.color}` } : { backgroundColor: f.color }}
              aria-hidden="true"
            />
            <span className="flex-1 text-xs text-gray-700">{f.etiqueta}</span>
            <span className="text-[11px] font-medium text-gray-500">{f.cantidad}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
