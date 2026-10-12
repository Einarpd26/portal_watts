"use client";

import { useRef } from 'react';
import Button from '@/components/ui/Button';
import { cn } from '@/utils/cn';
import { formatoArea, type EstadoPoligono } from '@/utils/estadoPoligono';
import { descripcionSuperposicion, detalleInvasion } from '@/utils/invasionZona';

interface BarraModoMapaProps {
  estado: EstadoPoligono;
  /** Zona de la ruta, para sugerir el traslado cuando su envolvente cubriría otras rutas (D7) */
  codigoZona: string;
  isSubmitting: boolean;
  puedeGuardar: boolean;
  onDibujar: () => void;
  onImportar: (archivo: File) => void;
  onDescartar: () => void;
  onGuardar: () => void;
}

const PUNTO = {
  neutro: 'bg-gray-400 ring-gray-100',
  ok: 'bg-success-600 ring-success-100',
  error: 'bg-amber-500 ring-amber-100',
} as const;

/**
 * Barra flotante sobre el mapa mientras se crea o edita una ruta (patrón de "modo mapa" de
 * perfil-ruta en inventory-manager): dice qué hacer en el mapa y ofrece la acción siguiente, para
 * que las indicaciones estén donde se actúa.
 */
export function BarraModoMapa({
  estado,
  codigoZona,
  isSubmitting,
  puedeGuardar,
  onDibujar,
  onImportar,
  onDescartar,
  onGuardar,
}: BarraModoMapaProps) {
  const archivoRef = useRef<HTMLInputElement>(null);

  let tono: keyof typeof PUNTO = 'neutro';
  let titulo: string;
  let detalle: string | null = null;
  switch (estado.tipo) {
    case 'pendiente':
      titulo = 'Define el polígono de la ruta';
      detalle = 'Dibújalo en el mapa o importa un archivo GeoJSON.';
      break;
    case 'guardado':
      titulo = 'Polígono guardado';
      detalle = 'Puedes editar sus vértices o reemplazarlo con un archivo.';
      break;
    case 'dibujando':
      titulo = estado.editando ? 'Editando vértices' : 'Dibujando';
      detalle = estado.editando
        ? 'Arrastra un vértice para moverlo, un punto intermedio para agregar uno, o clic derecho para quitarlo.'
        : 'Haz clic para agregar vértices y cierra en el primero (o con Enter). Los vértices vecinos atraen el cursor.';
      break;
    case 'validando':
      titulo = 'Validando el polígono…';
      break;
    case 'valido':
      tono = 'ok';
      titulo = 'Previsualización';
      detalle = [
        estado.vertices !== null ? `${estado.vertices - 1} vértices` : null,
        estado.area_m2 !== null ? formatoArea(estado.area_m2) : null,
        estado.ajustable ? 'puedes seguir ajustándolo' : null,
      ]
        .filter(Boolean)
        .join(' · ');
      break;
    case 'invalido': {
      tono = 'error';
      titulo = estado.motivo;
      const superposiciones = estado.conflictos.filter((c) => c.tipo === 'superposicion');
      // Las invasiones solo cuentan si no hay superposición: primero se corrige el polígono
      const invasiones = superposiciones.length === 0 ? estado.conflictos.filter((c) => c.tipo === 'invasion') : [];
      detalle = [
        superposiciones.length > 0 ? `En conflicto con ${descripcionSuperposicion(superposiciones)} (en ámbar).` : null,
        invasiones.length > 0 ? detalleInvasion(codigoZona, invasiones) : null,
        estado.ajustable ? 'Ajusta los vértices para resolverlo.' : null,
      ]
        .filter(Boolean)
        .join(' ');
      break;
    }
  }

  const sinCambios = estado.tipo === 'pendiente' || estado.tipo === 'guardado';

  return (
    <div
      role="status"
      className="absolute bottom-6 left-1/2 z-10 w-[min(92%,30rem)] -translate-x-1/2 rounded-2xl border border-gray-200 bg-white p-3 shadow-2xl"
    >
      <div className="flex items-start gap-2.5 px-1 pb-3">
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ring-4', PUNTO[tono])} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{titulo}</p>
          {detalle && <p className="mt-0.5 text-xs text-gray-600">{detalle}</p>}
        </div>
      </div>

      <input
        ref={archivoRef}
        type="file"
        accept=".geojson,.json,application/geo+json,application/json"
        className="hidden"
        aria-label="Archivo GeoJSON de la ruta"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onImportar(archivo);
          e.target.value = '';
        }}
      />

      <div className="flex flex-wrap justify-end gap-2">
        {sinCambios ? (
          <>
            <Button variant="secondary" size="sm" onClick={() => archivoRef.current?.click()} disabled={isSubmitting}>
              Importar archivo
            </Button>
            <Button size="sm" onClick={onDibujar} disabled={isSubmitting}>
              {estado.tipo === 'guardado' ? 'Editar polígono' : 'Dibujar'}
            </Button>
          </>
        ) : (
          <>
            <Button variant="secondary" size="sm" onClick={onDescartar} disabled={isSubmitting}>
              Descartar
            </Button>
            <Button size="sm" onClick={onGuardar} isLoading={isSubmitting} disabled={!puedeGuardar}>
              Guardar ruta
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
