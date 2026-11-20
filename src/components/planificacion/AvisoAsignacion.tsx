"use client";

import type { AvisoAsignacion as Aviso } from '@/hooks/useAsignacionEnMapa';

interface AvisoAsignacionProps {
  aviso: Aviso;
  onDeshacer: () => void;
}

/** Aviso flotante sobre el mapa con la última asignación y «Deshacer» (ADR-004 D2) */
export default function AvisoAsignacion({ aviso, onDeshacer }: AvisoAsignacionProps) {
  return (
    <div role="status" className="absolute inset-x-2 bottom-4 z-10 mx-auto w-fit max-w-sm rounded-xl bg-gray-900 px-4 py-2.5 text-white shadow-lg">
      <div className="flex items-center gap-3">
        <p className="text-xs">{aviso.mensaje}</p>
        <button type="button" onClick={onDeshacer} className="shrink-0 rounded-md bg-white/15 px-2 py-1 text-xs font-bold hover:bg-white/25">
          Deshacer
        </button>
      </div>
      {aviso.advertencia && <p className="mt-1.5 border-t border-white/20 pt-1.5 text-[11px] text-amber-200">{aviso.advertencia}</p>}
    </div>
  );
}
