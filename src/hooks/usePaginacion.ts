import { useCallback, useMemo, useState } from 'react';
import { paginaValida, paginar, totalDePaginas } from '@/utils/paginacion';

/**
 * Paginación en el cliente de una lista que ya está completa. `clave` resume los filtros: cuando cambia, la lista
 * vuelve a la página 1, sin efectos. Si la lista se acorta (p. ej. se revoca la última cuenta de la página), la página
 * se corrige sola a la última que existe.
 */
export function usePaginacion<T>(elementos: readonly T[], porPagina: number, clave: string) {
  const [estado, setEstado] = useState({ pagina: 1, clave });
  const totalPaginas = totalDePaginas(elementos.length, porPagina);
  const pagina = paginaValida(estado.clave === clave ? estado.pagina : 1, totalPaginas);
  const visibles = useMemo(() => paginar(elementos, pagina, porPagina), [elementos, pagina, porPagina]);
  const irA = useCallback((nueva: number) => setEstado({ pagina: nueva, clave }), [clave]);

  return {
    pagina,
    totalPaginas,
    visibles,
    irA,
    /** Posición (desde 1) del primer y del último elemento de la página, para «1–50 de 400» */
    desde: elementos.length === 0 ? 0 : (pagina - 1) * porPagina + 1,
    hasta: Math.min(pagina * porPagina, elementos.length),
  };
}
