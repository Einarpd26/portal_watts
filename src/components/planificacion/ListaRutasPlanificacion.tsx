"use client";

import { useMemo, useState } from 'react';
import CampoBusqueda from '@/components/ui/CampoBusqueda';
import { cn } from '@/utils/cn';
import type { PropiedadesRutaEnMapa } from '@/utils/planificacionMapa';
import type { RutaItem } from '@/types';

interface ListaRutasPlanificacionProps {
  rutas: RutaItem[];
  propiedades: ReadonlyMap<number, PropiedadesRutaEnMapa>;
  descripciones: ReadonlyMap<number, string[]>;
  seleccionId: number | null;
  onElegir: (idRuta: number) => void;
  /** Altura máxima de la lista; en una columna que ya se desplaza se deja sin límite */
  claseAltura?: string;
  /** La lista llena el alto de su contenedor y el buscador queda fijo arriba, sin desplazarse con ella */
  llenaLaColumna?: boolean;
}

/**
 * Las mismas rutas del mapa en una lista (ADR-004 D7): permite planificar sin tocar polígonos, con teclado o
 * lector de pantalla, y es la alternativa completa cuando una ruta es demasiado pequeña para tocarla.
 */
export default function ListaRutasPlanificacion({
  rutas,
  propiedades,
  descripciones,
  seleccionId,
  onElegir,
  claseAltura = 'max-h-64',
  llenaLaColumna = false,
}: ListaRutasPlanificacionProps) {
  const [filtro, setFiltro] = useState('');
  const visibles = useMemo(() => {
    const q = filtro.trim().toLowerCase();
    return q ? rutas.filter((r) => `${r.codigo_ruta} ${r.ruta}`.toLowerCase().includes(q)) : rutas;
  }, [rutas, filtro]);

  return (
    <div className={cn(llenaLaColumna ? 'flex min-h-0 flex-1 flex-col gap-2' : 'space-y-2')}>
      <CampoBusqueda valor={filtro} onCambiar={setFiltro} placeholder="Código o nombre" etiqueta="Buscar ruta por código o nombre" />
      <ul className={cn('divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 bg-white', llenaLaColumna ? 'min-h-0 flex-1' : claseAltura)} aria-label="Rutas">
        {visibles.length === 0 && <li className="px-3 py-2 text-xs text-gray-400">Sin resultados.</li>}
        {visibles.map((r) => {
          const p = propiedades.get(r.id);
          const lineas = descripciones.get(r.id) ?? [];
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-pressed={seleccionId === r.id}
                onClick={() => onElegir(r.id)}
                className={cn(
                  'flex w-full items-start gap-2 px-3 py-1.5 text-left transition-colors hover:bg-gray-50',
                  seleccionId === r.id && 'bg-gray-50'
                )}
              >
                {/* El color de la ruta es un dato del mapa: se aplica como estilo */}
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: p?.color }} aria-hidden="true" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold text-gray-900">
                    {r.codigo_ruta} — {r.ruta}
                  </span>
                  <span className="block truncate text-[11px] text-gray-500">{lineas.length > 0 ? lineas.join(' · ') : 'Sin planificar'}</span>
                </span>
                {p?.duplicada && (
                  <span className="shrink-0 rounded px-1 text-[10px] font-semibold text-amber-800 ring-1 ring-amber-300" title="Planificada más de una vez en la semana">
                    Duplicada
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
