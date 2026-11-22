"use client";

import { cn } from '@/utils/cn';
import { entradasDePaginacion } from '@/utils/paginacion';

interface PaginacionProps {
  /** Página actual, desde 1 */
  pagina: number;
  totalPaginas: number;
  onCambiar: (pagina: number) => void;
  /** Mientras se carga una página no se puede pedir otra */
  deshabilitada?: boolean;
  /** Para paneles angostos: siempre «actual / total» en lugar de los números, sin importar el ancho de la ventana */
  compacta?: boolean;
}

const BOTON_NAVEGAR =
  'flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50 active:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40';

const BOTON_PAGINA =
  'flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600/40';

/**
 * Paginación de las listas con muchos registros: primera, anterior, números (con saltos «···»), siguiente y última.
 * En el celular (o con `compacta`) los números se reemplazan por «actual / total», para que quepa en una sola fila.
 */
export function Paginacion({ pagina, totalPaginas, onCambiar, deshabilitada = false, compacta = false }: PaginacionProps) {
  const esPrimera = pagina <= 1;
  const esUltima = pagina >= totalPaginas;

  const navegar = (etiqueta: string, destino: number, apagado: boolean, simbolo: string) => (
    <button type="button" className={BOTON_NAVEGAR} onClick={() => onCambiar(destino)} disabled={apagado || deshabilitada} aria-label={etiqueta}>
      {simbolo}
    </button>
  );

  return (
    <nav aria-label="Paginación" className="flex items-center gap-1">
      {navegar('Primera página', 1, esPrimera, '«')}
      {navegar('Página anterior', pagina - 1, esPrimera, '‹')}

      {/* Escritorio: los números de página */}
      <div className={cn('hidden items-center gap-1', !compacta && 'sm:flex')}>
        {entradasDePaginacion(pagina, totalPaginas).map((entrada, i) =>
          entrada === 'puntos' ? (
            <span key={`puntos-${i}`} className="flex h-9 min-w-[2.25rem] select-none items-center justify-center text-sm text-gray-400" aria-hidden="true">
              ···
            </span>
          ) : (
            <button
              key={entrada}
              type="button"
              onClick={() => onCambiar(entrada)}
              disabled={deshabilitada}
              aria-label={`Página ${entrada}`}
              aria-current={entrada === pagina ? 'page' : undefined}
              className={cn(
                BOTON_PAGINA,
                entrada === pagina ? 'border-primary-600 bg-primary-600 text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {entrada}
            </button>
          )
        )}
      </div>

      {/* Celular: página actual sobre el total */}
      <span className={cn('px-2 text-sm tabular-nums text-gray-500', !compacta && 'sm:hidden')} aria-live="polite">
        {pagina}&thinsp;/&thinsp;{totalPaginas}
      </span>

      {navegar('Página siguiente', pagina + 1, esUltima, '›')}
      {navegar('Última página', totalPaginas, esUltima, '»')}
    </nav>
  );
}
