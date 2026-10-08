// Colores del mapa de territorio. Las capas de MapLibre no leen clases de Tailwind, así que se
// usan los hexadecimales de la paleta. Sin dependencias de Node.

// Un color por zona. Se evitan verde, ámbar y rojo, reservados para la propuesta, el conflicto
// y la selección inválida.
export const PALETA_ZONAS = [
  '#2563eb', // blue-600
  '#7c3aed', // violet-600
  '#0891b2', // cyan-600
  '#db2777', // pink-600
  '#4f46e5', // indigo-600
  '#475569', // slate-600
] as const;

export const COLOR_PROPUESTA = '#16a34a'; // green-600
export const COLOR_CONFLICTO = '#f59e0b'; // amber-500
export const COLOR_INVALIDO = '#dc2626'; // primary-600

/**
 * Color estable de cada zona: por su posición entre las zonas ordenadas por código, así una zona
 * conserva su color mientras no cambie el conjunto de zonas visibles.
 */
export function coloresPorZona(zonas: Array<{ id: number; codigo_zona: string }>): Map<number, string> {
  const ordenadas = [...zonas].sort((a, b) => a.codigo_zona.localeCompare(b.codigo_zona));
  return new Map(ordenadas.map((z, i) => [z.id, PALETA_ZONAS[i % PALETA_ZONAS.length]]));
}
