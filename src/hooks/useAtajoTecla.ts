"use client";

import { useEffect, useRef } from 'react';

/** True si el foco está en algo donde se escribe: ahí una tecla suelta no es un atajo */
function estaEscribiendo(destino: EventTarget | null): boolean {
  if (!(destino instanceof HTMLElement)) return false;
  return destino.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(destino.tagName);
}

/** Ejecuta `accion` al pulsar una tecla suelta (sin Ctrl, Alt ni Meta), salvo escribiendo en un campo o con `habilitado` en false */
export function useAtajoTecla(tecla: string, accion: () => void, habilitado = true) {
  const accionRef = useRef(accion);
  useEffect(() => {
    accionRef.current = accion;
  }, [accion]);

  useEffect(() => {
    if (!habilitado) return;
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== tecla.toLowerCase() || e.ctrlKey || e.altKey || e.metaKey || e.repeat) return;
      if (estaEscribiendo(e.target)) return;
      e.preventDefault();
      accionRef.current();
    };
    window.addEventListener('keydown', alPulsar);
    return () => window.removeEventListener('keydown', alPulsar);
  }, [tecla, habilitado]);
}
