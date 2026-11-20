import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/logger';

/** Pantalla completa de un elemento (la columna del mapa): su referencia, si está activa y cómo alternarla */
export function usePantallaCompleta<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [activa, setActiva] = useState(false);

  useEffect(() => {
    const alCambiar = () => setActiva(document.fullscreenElement !== null);
    document.addEventListener('fullscreenchange', alCambiar);
    return () => document.removeEventListener('fullscreenchange', alCambiar);
  }, []);

  const alternar = useCallback(() => {
    const accion = document.fullscreenElement ? document.exitFullscreen() : ref.current?.requestFullscreen();
    accion?.catch((err: unknown) => logger.error('No se pudo cambiar la pantalla completa:', err));
  }, []);

  return { ref, activa, alternar };
}
