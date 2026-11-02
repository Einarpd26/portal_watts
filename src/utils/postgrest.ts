/**
 * PostgREST devuelve una relación a-uno como objeto o como arreglo según la restricción de
 * unicidad: este ayudante normaliza ambos casos al primer elemento, o null si no hay.
 */
export function primero<T>(valor: T | T[] | null | undefined): T | null {
  if (Array.isArray(valor)) return valor[0] ?? null;
  return valor ?? null;
}
