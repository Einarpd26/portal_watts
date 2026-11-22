"use client";

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/utils/cn';

export interface AccionDeFila {
  etiqueta: string;
  onClick: () => void;
  variante?: 'normal' | 'peligro';
  /** Una acción deshabilitada se ve pero no se puede elegir; `motivo` dice por qué */
  deshabilitada?: boolean;
  motivo?: string;
}

interface MenuAccionesProps {
  acciones: AccionDeFila[];
  /** Nombre accesible del botón, p. ej. «Acciones para Central» */
  etiqueta: string;
}

const SEPARACION = 4;
const MARGEN = 8;

interface Posicion {
  arriba: number;
  derecha: number;
}

/**
 * Menú «⋮» de una fila. Sale por un portal al <body> con posición fija para que las tablas con
 * desplazamiento no lo recorten; se abre hacia abajo y, si no cabe, hacia arriba.
 */
export function MenuAcciones({ acciones, etiqueta }: MenuAccionesProps) {
  const [abierto, setAbierto] = useState(false);
  const [posicion, setPosicion] = useState<Posicion | null>(null);
  const botonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Se mide después de dibujar: así se sabe cuánto mide el menú antes de decidir hacia dónde abrirlo
  useLayoutEffect(() => {
    if (!abierto || !botonRef.current || !menuRef.current) return;
    const caja = botonRef.current.getBoundingClientRect();
    const alto = menuRef.current.offsetHeight;
    const cabeAbajo = caja.bottom + SEPARACION + alto <= window.innerHeight - MARGEN;
    setPosicion({
      arriba: cabeAbajo ? caja.bottom + SEPARACION : Math.max(MARGEN, caja.top - SEPARACION - alto),
      derecha: Math.max(MARGEN, window.innerWidth - caja.right),
    });
  }, [abierto]);

  useEffect(() => {
    if (!abierto) return;
    const cerrar = () => setAbierto(false);
    const alPresionar = (e: MouseEvent) => {
      const destino = e.target as Node;
      if (botonRef.current?.contains(destino) || menuRef.current?.contains(destino)) return;
      cerrar();
    };
    const alTeclear = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      cerrar();
      botonRef.current?.focus();
    };
    document.addEventListener('mousedown', alPresionar);
    document.addEventListener('keydown', alTeclear);
    // Un menú fijo se despegaría de su botón al desplazar: mejor cerrarlo
    window.addEventListener('scroll', cerrar, true);
    window.addEventListener('resize', cerrar);
    return () => {
      document.removeEventListener('mousedown', alPresionar);
      document.removeEventListener('keydown', alTeclear);
      window.removeEventListener('scroll', cerrar, true);
      window.removeEventListener('resize', cerrar);
    };
  }, [abierto]);

  const alternar = () => {
    setPosicion(null);
    setAbierto((v) => !v);
  };

  return (
    <div className="relative inline-block">
      <button
        ref={botonRef}
        type="button"
        onClick={alternar}
        aria-label={etiqueta}
        aria-haspopup="menu"
        aria-expanded={abierto}
        className={cn(
          'flex h-9 w-9 items-center justify-center rounded-lg transition-colors',
          abierto ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
        )}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>

      {abierto &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            // La posición se calcula al abrir a partir del botón: es un dato de ejecución, no un estilo fijo
            style={{ top: posicion?.arriba ?? 0, right: posicion?.derecha ?? 0 }}
            // Oculto hasta medirlo, para que nunca parpadee en un lugar equivocado
            className={cn('fixed z-50 w-44 rounded-lg border border-gray-100 bg-white py-1 shadow-lg', !posicion && 'invisible')}
          >
            {acciones.map((a) => (
              <button
                key={a.etiqueta}
                type="button"
                role="menuitem"
                disabled={a.deshabilitada}
                title={a.deshabilitada ? a.motivo : undefined}
                onClick={() => {
                  setAbierto(false);
                  a.onClick();
                }}
                className={cn(
                  'block w-full px-4 py-2.5 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:text-gray-300',
                  a.variante === 'peligro' ? 'text-red-600 enabled:hover:bg-red-50' : 'text-gray-700 enabled:hover:bg-gray-50'
                )}
              >
                {a.etiqueta}
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
