"use client";

import type { FormEvent, ReactNode } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface HojaFormularioProps {
  abierta: boolean;
  titulo: string;
  /** Mientras se envía no se puede cerrar con Esc ni tocando el fondo */
  bloqueada?: boolean;
  onEnviar: () => void;
  onCerrar: () => void;
  children: ReactNode;
  /** Botones de la hoja; quedan fijos abajo mientras el contenido se desplaza */
  pie: ReactNode;
}

/**
 * Formulario en una hoja: en el celular sube desde abajo y en escritorio es un panel a la derecha. Los botones quedan
 * siempre a la vista y el contenido se desplaza si no cabe (por ejemplo, con el teclado abierto).
 */
export function HojaFormulario({ abierta, titulo, bloqueada = false, onEnviar, onCerrar, children, pie }: HojaFormularioProps) {
  useEscapeKey(onCerrar, abierta && !bloqueada);

  if (!abierta) return null;

  const alEnviar = (e: FormEvent) => {
    e.preventDefault();
    onEnviar();
  };

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/40" onClick={bloqueada ? undefined : onCerrar} aria-hidden="true" />
      <form
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        noValidate
        onSubmit={alEnviar}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[85dvh] flex-col rounded-t-2xl bg-white shadow-xl md:inset-y-0 md:left-auto md:right-0 md:max-h-none md:w-[420px] md:rounded-l-2xl md:rounded-tr-none"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pb-3 pt-5">
          <h3 className="text-base font-bold text-gray-900">{titulo}</h3>
          <button
            type="button"
            onClick={onCerrar}
            disabled={bloqueada}
            aria-label="Cerrar"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-5 pb-4">{children}</div>
        <div className="flex shrink-0 gap-3 border-t border-gray-100 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">{pie}</div>
      </form>
    </>
  );
}
