"use client";

import { cn } from '@/utils/cn';
import { formatToUtcString, getAccionBadgeClasses, getModuloBadgeClasses, type BitacoraRow } from '@/utils/bitacoraUtils';

interface EventoTarjetaProps {
  evento: BitacoraRow;
  onAbrir: (evento: BitacoraRow) => void;
}

/**
 * Un evento de la bitácora como tarjeta, para el celular: la acción y la hora arriba, la descripción completa en el
 * medio y quién lo hizo abajo. Tocar la tarjeta abre el detalle.
 */
export default function EventoTarjeta({ evento, onAbrir }: EventoTarjetaProps) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onAbrir(evento)}
        aria-label={`Ver el detalle del evento ${evento.accion}`}
        className="block w-full space-y-1.5 rounded-lg border border-gray-200 px-3 py-2.5 text-left transition-colors hover:bg-gray-50"
      >
        <span className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', getAccionBadgeClasses(evento.accion))}>
            {evento.accion}
          </span>
          <span className="font-mono text-[11px] text-gray-500">{formatToUtcString(evento.created_at)}</span>
        </span>
        <span className="block break-words text-sm text-gray-800">{evento.descripcion}</span>
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
          <span className="min-w-0 break-all font-medium text-gray-700">{evento.usuario_email}</span>
          <span className="font-mono">{evento.usuario_rol ?? 'Invitado / Anónimo'}</span>
          <span className={cn('inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold', getModuloBadgeClasses(evento.modulo))}>
            {evento.modulo}
          </span>
        </span>
      </button>
    </li>
  );
}
