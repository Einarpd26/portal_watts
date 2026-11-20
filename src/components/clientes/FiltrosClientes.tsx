"use client";

import Input from '@/components/ui/Input';
import Select from '@/components/ui/Select';
import { cn } from '@/utils/cn';
import { CLASES_ABC, COLOR_SIN_CLASE, DESCRIPCION_CLASE, colorDeCliente, type ConteoPorClase, type FiltrosClientes as Filtros } from '@/utils/clientesMapa';
import type { ClaseAbc, RutaItem } from '@/types';

interface FiltrosClientesProps {
  filtros: Filtros;
  onCambiar: (filtros: Filtros) => void;
  rutas: RutaItem[];
  conteo: ConteoPorClase;
}

const TITULO = 'mb-1.5 text-[11px] font-bold uppercase tracking-wider text-gray-400';

/** Interruptor de una clase: hace de filtro y de leyenda (color, descripción y cantidad de clientes) */
function BotonClase({ activo, color, titulo, detalle, cantidad, onClick }: {
  activo: boolean;
  color: string;
  titulo: string;
  detalle: string;
  cantidad: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={activo}
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-lg border px-2 py-1.5 text-left transition-colors',
        activo ? 'border-gray-300 bg-white' : 'border-transparent bg-gray-50 opacity-50'
      )}
    >
      {/* El color de la clase es un dato del mapa (no hay clase de Tailwind para él): se aplica como estilo */}
      <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-black/10" style={{ backgroundColor: color }} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-gray-900">{titulo}</span>
        <span className="block truncate text-[11px] text-gray-500">{detalle}</span>
      </span>
      <span className="shrink-0 text-[11px] font-medium text-gray-500">{cantidad}</span>
    </button>
  );
}

/** Filtros del mapa de clientes: clase (que además es la leyenda), ruta y búsqueda (CU-12) */
export default function FiltrosClientes({ filtros, onCambiar, rutas, conteo }: FiltrosClientesProps) {
  const alternarClase = (clase: ClaseAbc) => {
    const clases = new Set(filtros.clases);
    if (!clases.delete(clase)) clases.add(clase);
    onCambiar({ ...filtros, clases });
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby="filtro-clases">
        <h3 id="filtro-clases" className={TITULO}>
          Clase ABC
        </h3>
        <div className="space-y-1">
          {CLASES_ABC.map((clase) => (
            <BotonClase
              key={clase}
              activo={filtros.clases.has(clase)}
              color={colorDeCliente(clase)}
              titulo={clase === 'I' ? 'Inactivo' : `Clase ${clase}`}
              detalle={DESCRIPCION_CLASE[clase]}
              cantidad={conteo[clase]}
              onClick={() => alternarClase(clase)}
            />
          ))}
          {conteo.sinClase > 0 && (
            <BotonClase
              activo={filtros.sinClase}
              color={COLOR_SIN_CLASE}
              titulo="No habilitado"
              detalle="Sin clasificar"
              cantidad={conteo.sinClase}
              onClick={() => onCambiar({ ...filtros, sinClase: !filtros.sinClase })}
            />
          )}
        </div>
      </section>

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
    </div>
  );
}
