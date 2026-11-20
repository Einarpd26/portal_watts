"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import Toast, { type PosicionToast } from '@/components/ui/Toast';

type TipoToast = 'success' | 'error';

interface EstadoToast {
  message: string;
  type: TipoToast;
  duration: number;
  /** Cambia con cada aviso: un aviso nuevo reinicia el anterior en vez de heredar su tiempo */
  key: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: TipoToast, duration?: number) => void;
}

// Los errores duran más que los éxitos: hay que poder leer el motivo
const DURACION_POR_TIPO: Record<TipoToast, number> = { success: 3000, error: 6000 };

const ToastContext = createContext<ToastContextValue | null>(null);
// Contexto aparte para que quien solo declara su posición no se renderice con cada aviso
const PosicionContext = createContext<((posicion: PosicionToast) => void) | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<EstadoToast | null>(null);
  const [posicion, setPosicion] = useState<PosicionToast>('bottom');

  const showToast = useCallback((message: string, type: TipoToast = 'success', duration = DURACION_POR_TIPO[type]) => {
    setToast({ message, type, duration, key: Date.now() });
  }, []);
  const valor = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={valor}>
      <PosicionContext.Provider value={setPosicion}>
        {children}
        {toast && <Toast key={toast.key} message={toast.message} type={toast.type} duration={toast.duration} position={posicion} onDismiss={() => setToast(null)} />}
      </PosicionContext.Provider>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast debe usarse dentro de ToastProvider');
  return ctx;
}

/** Hace que los avisos de esta pantalla salgan por `posicion`; al salir de la pantalla vuelven a salir abajo */
export function useToastPosition(posicion: PosicionToast) {
  const fijar = useContext(PosicionContext);
  useEffect(() => {
    if (!fijar) return;
    fijar(posicion);
    return () => fijar('bottom');
  }, [fijar, posicion]);
}
