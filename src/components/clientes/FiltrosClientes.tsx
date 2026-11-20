"use client";

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { AbcBadge } from './AbcBadge';
import { CLASES_ABC, DESCRIPCION_CLASE, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { ClaseAbc, RutaItem } from '@/types';

interface FiltrosClientesProps {
  filtros: Filtros;
  onCambiar: (filtros: Filtros) => void;
  rutas: RutaItem[];
  /** Hay clientes no habilitados en el ámbito elegido: se ofrece su interruptor */
  haySinClase: boolean;
}

/** Interruptor de una clase: la insignia hace de filtro y de leyenda (el detalle va en el título) */
function InterruptorClase({ activo, clase, titulo, onClick }: { activo: boolean; clase: ClaseAbc | null; titulo: string; onClick: () => void }) {
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

/** Filtros del mapa de clientes: ruta, búsqueda y clase (CU-12). La cantidad de cada clase está en el resumen */
export default function FiltrosClientes({ filtros, onCambiar, rutas, haySinClase }: FiltrosClientesProps) {
  const alternarClase = (clase: ClaseAbc) => {
    const clases = new Set(filtros.clases);
    if (!clases.delete(clase)) clases.add(clase);
    onCambiar({ ...filtros, clases });
  };

  return (
    <div className="space-y-2.5">
      <Select
        label="Ruta"
        compact
        value={filtros.idRuta ?? ''}
        onChange={(e) => onCambiar({ ...filtros, idRuta: e.target.value === '' ? null : Number(e.target.value) })}
      >
        <option value="">Todas las rutas</option>
        {rutas.map((r) => (
          <option key={r.id} value={r.id}>
            {r.codigo_ruta} — {r.ruta}
          </option>
        ))}
      </Select>

      <Input
        label="Buscar cliente"
        compact
        value={filtros.texto}
        onChange={(e) => onCambiar({ ...filtros, texto: e.target.value })}
        placeholder="Código, nombre o dirección"
      />

      <div role="group" aria-label="Clase ABC" className="flex flex-wrap gap-1.5">
        {CLASES_ABC.map((clase) => (
          <InterruptorClase key={clase} activo={filtros.clases.has(clase)} clase={clase} titulo={DESCRIPCION_CLASE[clase]} onClick={() => alternarClase(clase)} />
        ))}
        {haySinClase && (
          <InterruptorClase activo={filtros.sinClase} clase={null} titulo="Sin clasificar" onClick={() => onCambiar({ ...filtros, sinClase: !filtros.sinClase })} />
        )}
      </div>
    </div>
  );
}
