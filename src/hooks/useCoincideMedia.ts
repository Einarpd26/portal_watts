import { useCallback, useSyncExternalStore } from 'react';

/**
 * Si la ventana cumple una media query (p. ej. '(min-width: 1024px)') y se actualiza al cambiarla. Sirve para
 * montar una sola versión de una pantalla (celular o escritorio) en vez de dos y ocultar una con CSS. En el
 * servidor, y antes de hidratar, responde false.
 */
export function useCoincideMedia(consulta: string): boolean {
  const suscribirse = useCallback(
    (alCambiar: () => void) => {
      const lista = window.matchMedia(consulta);
      lista.addEventListener('change', alCambiar);
      return () => lista.removeEventListener('change', alCambiar);
    },
    [consulta]
  );
  return useSyncExternalStore(
    suscribirse,
    () => window.matchMedia(consulta).matches,
    () => false
  );
}
