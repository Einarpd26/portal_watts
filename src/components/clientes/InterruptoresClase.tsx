"use client";

import { AbcBadge } from './AbcBadge';
import { cn } from '@/utils/cn';
import { CLASES_ABC, DESCRIPCION_CLASE, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { ClaseAbc } from '@/types';

interface InterruptoresClaseProps {
  filtros: Filtros;
  onCambiar: (cambio: Partial<Filtros>) => void;
  /** Hay clientes no habilitados en el ámbito elegido: se ofrece su interruptor */
  haySinClase: boolean;
}

/** Interruptor de una clase: la insignia hace de filtro y de leyenda (el detalle va en el título) */
function Interruptor({ activo, clase, titulo, onClick }: { activo: boolean; clase: ClaseAbc | null; titulo: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      title={titulo}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-medium transition-colors',
        activo ? 'border-gray-300 bg-white text-gray-800' : 'border-transparent bg-gray-100 text-gray-400 opacity-60'
      )}
    >
      <AbcBadge clase={clase} tamano="sm" />
      {clase === 'I' ? 'Inactivo' : clase ? `Clase ${clase}` : 'No habilitado'}
    </button>
  );
}

/** Filtro por clase del mapa de clientes (CU-12). La cantidad de cada clase está en el resumen */
export function InterruptoresClase({ filtros, onCambiar, haySinClase }: InterruptoresClaseProps) {
  const alternarClase = (clase: ClaseAbc) => {
    const clases = new Set(filtros.clases);
    if (!clases.delete(clase)) clases.add(clase);
    onCambiar({ clases });
  };

  return (
    <div role="group" aria-label="Clase ABC" className="flex flex-wrap gap-1.5">
      {CLASES_ABC.map((clase) => (
        <Interruptor key={clase} activo={filtros.clases.has(clase)} clase={clase} titulo={DESCRIPCION_CLASE[clase]} onClick={() => alternarClase(clase)} />
      ))}
      {haySinClase && <Interruptor activo={filtros.sinClase} clase={null} titulo="Sin clasificar" onClick={() => onCambiar({ sinClase: !filtros.sinClase })} />}
    </div>
  );
}
