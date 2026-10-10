"use client";

import Button from '@/components/ui/Button';
import type { RutaItem } from '@/types';

interface TarjetaRutaProps {
  ruta: RutaItem;
  codigoZona: string;
  color: string | undefined;
  isExportando: boolean;
  onEditarPoligono: () => void;
  onEditarDatos: () => void;
  onExportar: () => void;
  onCerrar: () => void;
}

/**
 * Tarjeta de la ruta elegida, anclada sobre su polígono en el mapa: las acciones quedan donde
 * se mira la ruta, sin volver al panel lateral (útil también en pantalla completa).
 */
export function TarjetaRuta({
  ruta,
  codigoZona,
  color,
  isExportando,
  onEditarPoligono,
  onEditarDatos,
  onExportar,
  onCerrar,
}: TarjetaRutaProps) {
  return (
    <article className="w-64 p-3" aria-label={`Ruta ${ruta.codigo_ruta}`}>
      <header className="flex items-start gap-2">
        <span
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
          // El color de la zona es un dato, no un estilo fijo: no hay clase de Tailwind para él
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            {ruta.codigo_ruta} · {ruta.ruta}
          </p>
          <p className="truncate text-xs text-gray-500">
            Zona {codigoZona}
            {ruta.descripcion_ruta ? ` · ${ruta.descripcion_ruta}` : ''}
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

      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" onClick={onEditarPoligono}>
          Editar polígono
        </Button>
        <Button variant="secondary" size="sm" onClick={onEditarDatos}>
          Editar datos
        </Button>
        <Button variant="secondary" size="sm" onClick={onExportar} disabled={isExportando}>
          Exportar
        </Button>
      </div>
    </article>
  );
}
