"use client";

import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/utils/cn';

/** Un deslizamiento de más de esta cantidad de píxeles estira o encoge la hoja */
const UMBRAL_DESLIZAMIENTO = 30;

interface HojaInferiorProps {
  /** Nombre accesible de la hoja (p. ej. «Ficha del cliente CS1-003») */
  etiqueta: string;
  onCerrar: () => void;
  children: ReactNode;
}

/**
 * Hoja inferior del celular, dentro del flujo (el mapa se achica, no queda tapado): mide un tercio de la pantalla
 * y llega al 80 % al deslizar hacia arriba; hacia abajo se encoge y, si ya está encogida, se cierra. Tocar la manija
 * también la estira y la encoge. Quien la use debe darle `key` con el id de lo que muestra, para que cada elemento
 * empiece encogido (ADR-004 D7).
 */
export function HojaInferior({ etiqueta, onCerrar, children }: HojaInferiorProps) {
  const [expandida, setExpandida] = useState(false);
  const inicioY = useRef<number | null>(null);

  const alTocar = (e: React.TouchEvent) => {
    inicioY.current = e.touches[0]?.clientY ?? null;
  };
  const alSoltar = (e: React.TouchEvent) => {
    const fin = e.changedTouches[0]?.clientY;
    if (inicioY.current === null || fin === undefined) return;
    const desplazamiento = inicioY.current - fin;
    inicioY.current = null;
    if (desplazamiento > UMBRAL_DESLIZAMIENTO) setExpandida(true);
    else if (desplazamiento < -UMBRAL_DESLIZAMIENTO) {
      if (expandida) setExpandida(false);
      else onCerrar();
    }
  };

  return (
    <aside
      aria-label={etiqueta}
      className={cn(
        'flex shrink-0 flex-col overflow-hidden rounded-t-3xl border-t border-gray-200 bg-white shadow-[0_-4px_32px_rgba(0,0,0,.1)] transition-[height] duration-300 ease-out',
        expandida ? 'h-[80dvh]' : 'h-[33dvh]'
      )}
    >
      <button
        type="button"
        onClick={() => setExpandida((v) => !v)}
        onTouchStart={alTocar}
        onTouchEnd={alSoltar}
        aria-label={expandida ? 'Reducir la hoja' : 'Ampliar la hoja'}
        aria-expanded={expandida}
        className="flex shrink-0 justify-center pb-2 pt-3"
      >
        <span className="h-1 w-10 rounded-full bg-gray-300" />
      </button>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-8">{children}</div>
    </aside>
  );
}
