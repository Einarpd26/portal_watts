// Números de página de la paginación. Sin dependencias de Node ni del navegador.

export type EntradaPaginacion = number | 'puntos';

/** Cantidad de páginas consecutivas que se muestran alrededor de la actual */
const VENTANA = 5;

/** Números de página a mostrar: siempre la primera y la última, la ventana alrededor de la actual y «···» en los saltos */
export function entradasDePaginacion(actual: number, total: number): EntradaPaginacion[] {
  if (total <= VENTANA + 2) return Array.from({ length: total }, (_, i) => i + 1);

  let izquierda = Math.max(1, actual - 2);
  let derecha = Math.min(total, actual + 2);
  // La ventana conserva su tamaño cuando la actual está en un extremo
  if (derecha - izquierda < VENTANA - 1) {
    if (izquierda === 1) derecha = Math.min(total, izquierda + VENTANA - 1);
    else izquierda = Math.max(1, derecha - VENTANA + 1);
  }

  const entradas: EntradaPaginacion[] = [];
  if (izquierda > 1) entradas.push(1);
  // Un salto de una sola página no lleva «···»: se muestra esa página
  if (izquierda === 3) entradas.push(2);
  else if (izquierda > 3) entradas.push('puntos');
  for (let p = izquierda; p <= derecha; p++) entradas.push(p);
  if (derecha === total - 2) entradas.push(total - 1);
  else if (derecha < total - 2) entradas.push('puntos');
  if (derecha < total) entradas.push(total);
  return entradas;
}

/** Cantidad de páginas para `cantidad` elementos; con ninguno, una sola (vacía) */
export const totalDePaginas = (cantidad: number, porPagina: number): number => Math.max(1, Math.ceil(cantidad / porPagina));

/** Lleva una página pedida al rango que existe: si la lista se acortó, no queda en una página que ya no está */
export const paginaValida = (pagina: number, total: number): number => Math.min(Math.max(1, pagina), total);

/** Los elementos de una página (desde 1) */
export const paginar = <T,>(elementos: readonly T[], pagina: number, porPagina: number): T[] =>
  elementos.slice((pagina - 1) * porPagina, pagina * porPagina);
