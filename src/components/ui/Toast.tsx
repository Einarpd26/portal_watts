"use client";

import { useCallback, useEffect, useState } from 'react';
import { cn } from '@/utils/cn';

export type PosicionToast = 'top' | 'bottom';

interface ToastProps {
  message: string;
  type: 'error' | 'success';
  onDismiss: () => void;
  duration: number;
  position: PosicionToast;
}

function IconoExito() {
  return (
    <svg className="h-5 w-5 shrink-0 text-emerald-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5z" clipRule="evenodd" />
    </svg>
  );
}

function IconoError() {
  return (
    <svg className="h-5 w-5 shrink-0 text-red-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" clipRule="evenodd" />
    </svg>
  );
}

/** Aviso breve y flotante: se cierra solo (los errores duran más) y lleva una barra que marca el tiempo que queda */
export default function Toast({ message, type, onDismiss, duration, position }: ToastProps) {
  const [saliendo, setSaliendo] = useState(false);

  const cerrar = useCallback(() => {
    setSaliendo(true);
    setTimeout(onDismiss, 200);
  }, [onDismiss]);

  useEffect(() => {
    const temporizador = setTimeout(cerrar, duration);
    return () => clearTimeout(temporizador);
  }, [cerrar, duration]);

  const arriba = position === 'top';

  return (
    <div
      role={type === 'error' ? 'alert' : 'status'}
      aria-live={type === 'error' ? 'assertive' : 'polite'}
      className={cn(
        'fixed inset-x-4 z-50 mx-auto max-w-sm overflow-hidden rounded-xl bg-gray-900 shadow-xl',
        arriba ? 'top-4' : 'bottom-6',
        arriba ? (saliendo ? 'toast-exit-top' : 'toast-enter-top') : saliendo ? 'toast-exit' : 'toast-enter'
      )}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {type === 'success' ? <IconoExito /> : <IconoError />}
        <span className="flex-1 text-sm font-medium leading-snug text-white">{message}</span>
        <button type="button" onClick={cerrar} aria-label="Cerrar el aviso" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-base font-bold text-gray-400 transition-colors hover:text-white">
          ×
        </button>
      </div>
      {/* La duración depende del tipo de aviso: se aplica en tiempo de ejecución */}
      <div className={cn('toast-progress h-0.5 w-full', type === 'error' ? 'bg-red-500' : 'bg-emerald-500')} style={{ animationDuration: `${duration}ms` }} />
    </div>
  );
}
