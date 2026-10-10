"use client";

import Button from '@/components/ui/Button';
import type { ZonaItem } from '@/types';

interface TarjetaZonaProps {
  zona: ZonaItem;
  color: string | undefined;
  mostrarSucursal: boolean;
  onEditar: () => void;
  onSupervisor: () => void;
  onEliminar: () => void;
  onCerrar: () => void;
}

/**
 * Tarjeta de la zona elegida, anclada sobre su contorno en el mapa (como TarjetaRuta). Una zona
 * con rutas no se puede eliminar (CU-04 A3): el botón queda deshabilitado con el motivo.
 */
export function TarjetaZona({ zona, color, mostrarSucursal, onEditar, onSupervisor, onEliminar, onCerrar }: TarjetaZonaProps) {
  const tieneRutas = zona.total_rutas > 0;
  return (
    <article className="w-72 p-3" aria-label={`Zona ${zona.codigo_zona}`}>
      <header className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          // El color de la zona es un dato, no un estilo fijo: no hay clase de Tailwind para él
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {zona.codigo_zona} · {zona.zona}
          </p>
          <p className="truncate text-xs text-gray-500">
            {mostrarSucursal ? `${zona.sucursal_nombre} · ` : ''}
            {zona.total_rutas === 1 ? '1 ruta' : `${zona.total_rutas} rutas`}
          </p>
          <p className="truncate text-xs text-gray-500">
            Supervisor: {zona.supervisor ? zona.supervisor.nombre : <span className="text-amber-700">sin asignar</span>}
          </p>
        </div>
        <button
          type="button"
          onClick={onCerrar}
          aria-label="Cerrar"
          className="-mr-1 -mt-1 rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>
      </header>

      {!tieneRutas && (
        <p className="mt-2 text-xs text-gray-500">Sin rutas todavía: su contorno aparece cuando se le agregan.</p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onEditar}>
          Editar datos
        </Button>
        <Button variant="secondary" size="sm" onClick={onSupervisor}>
          Supervisor
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onEliminar}
          disabled={tieneRutas}
          title={tieneRutas ? 'No se puede eliminar: la zona tiene rutas asociadas' : undefined}
        >
          Eliminar
        </Button>
      </div>
    </article>
  );
}
