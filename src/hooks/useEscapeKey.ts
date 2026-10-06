import { useEffect, useRef } from 'react';

/**
 * Ejecuta `onEscape` al pulsar Esc mientras `enabled` sea true.
 * Pensado para que cada modal o panel abierto reaccione igual que su botón "Cancelar".
 * El callback se guarda en una ref para no re-suscribir el listener en cada render.
 */
export function useEscapeKey(onEscape: () => void, enabled = true): void {
  const callbackRef = useRef(onEscape);

  useEffect(() => {
    callbackRef.current = onEscape;
  }, [onEscape]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Esc también cierra el selector de método de entrada (IME): no interferir con él
      if (event.key !== 'Escape' || event.isComposing || event.defaultPrevented) return;
      callbackRef.current();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
}
